import WebSocket from 'ws';
import { connectToGrok, type GrokConnection } from './grok-client.js';
import { connectToMockGrok, isMockModeEnabled } from './mock-grok-client.js';
import { executeToolCall } from './tool-handlers.js';
import { saveCallRecord } from './supabase-client.js';
import { runPostCallProcessing } from './post-call.js';
import { verifyRelayToken } from './auth.js';
// Audio conversion is no longer needed — Grok now uses audio/pcmu (μ-law 8kHz)
// which is Twilio's native format. Audio passes straight through.

/** Valid outcome values accepted by the calls_outcome_check constraint in Supabase */
type CallOutcome = 'missed' | 'booking' | 'message' | 'transfer' | 'cancellation';

interface CallSession {
  streamSid: string;
  merchantId: string;
  callerPhone: string;
  verified: boolean;
  twilioWs: WebSocket;
  grokConnection: GrokConnection | null;
  transcript: Array<{ speaker: 'user' | 'assistant'; text: string; timestamp: Date }>;
  startedAt: Date;
  toolsCalled: Set<string>;
}

/**
 * Handle a Twilio Media Stream WebSocket connection.
 *
 * Auth happens in the 'start' event because Twilio strips query params
 * from the <Stream> URL and sends them as customParameters instead.
 */
export function handleMediaStream(twilioWs: WebSocket): void {
  const session: CallSession = {
    streamSid: '',
    merchantId: '',
    callerPhone: '',
    verified: false,
    twilioWs,
    grokConnection: null,
    transcript: [],
    startedAt: new Date(),
    toolsCalled: new Set<string>(),
  };

  twilioWs.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.event) {
        case 'connected':
          console.log('[MediaStream] Twilio connected');
          break;

        case 'start':
          await handleStart(session, message);
          break;

        case 'media':
          handleMedia(session, message);
          break;

        case 'stop':
          await handleStop(session);
          break;

        case 'mark':
          console.log(`[MediaStream] Mark received: ${message.mark?.name}`);
          break;
      }
    } catch (error) {
      console.error('[MediaStream] Error handling Twilio message:', error);
    }
  });

  twilioWs.on('close', () => {
    console.log('[MediaStream] Twilio disconnected');
    session.grokConnection?.close();
  });

  twilioWs.on('error', (error) => {
    console.error('[MediaStream] Twilio WebSocket error:', error);
    session.grokConnection?.close();
  });
}

async function handleStart(session: CallSession, message: TwilioStartMessage): Promise<void> {
  console.log('[MediaStream] Start event received');
  console.log('[MediaStream] customParameters:', JSON.stringify(message.start.customParameters));

  session.streamSid = message.start.streamSid;

  // Verify HMAC token from customParameters (sent as <Parameter> elements in TwiML)
  const params = message.start.customParameters || {};
  const verified = verifyRelayToken({
    token: params.token,
    merchantId: params.merchantId,
    callerPhone: params.callerPhone,
    ts: params.ts,
  });

  if (!verified) {
    console.error('[MediaStream] Token verification failed — closing connection');
    session.twilioWs.close(4401, 'Unauthorized');
    return;
  }

  session.merchantId = verified.merchantId;
  session.callerPhone = verified.callerPhone;
  session.verified = true;

  console.log(`[MediaStream] Call started: merchant=${session.merchantId}, caller=${session.callerPhone}`);

  try {
    const connectionOptions = {
      onAudio: (audioBase64: string) => {
        // μ-law passthrough — Grok outputs audio/pcmu which Twilio accepts directly
        sendToTwilio(session, audioBase64);
      },
      onToolCall: async (toolName: string, params: Record<string, unknown>) => {
        session.toolsCalled.add(toolName);
        return await executeToolCall(session.merchantId, toolName, params);
      },
      onTranscript: (text: string, speaker: 'user' | 'assistant') => {
        session.transcript.push({ speaker, text, timestamp: new Date() });
      },
      onError: (error: Error) => {
        console.error('[MediaStream] Grok error:', error);
      },
    };

    // Use mock client in development, real client in production
    if (isMockModeEnabled()) {
      console.log('[MediaStream] Using MOCK Grok client');
      session.grokConnection = await connectToMockGrok(session.merchantId, connectionOptions);
    } else {
      console.log('[MediaStream] Using REAL Grok client');
      session.grokConnection = await connectToGrok(session.merchantId, connectionOptions);
    }
  } catch (error) {
    console.error('[MediaStream] Failed to connect to Grok:', error);
  }
}

function handleMedia(session: CallSession, message: TwilioMediaMessage): void {
  if (!session.grokConnection || !session.verified) return;

  // μ-law passthrough — Twilio's native format matches Grok's audio/pcmu input
  session.grokConnection.sendAudio(message.media.payload);
}

/**
 * Derive call outcome from tools called during the conversation.
 * Priority: booking > cancellation > message > transfer > message (default)
 * The DB constraint only allows: missed, booking, message, transfer, cancellation
 */
function deriveOutcome(toolsCalled: Set<string>): CallOutcome {
  if (toolsCalled.has('createBooking')) return 'booking';
  if (toolsCalled.has('cancelBooking')) return 'cancellation';
  if (toolsCalled.has('takeMessage')) return 'message';
  // Default for any answered call where no specific tool was used
  return 'message';
}

async function handleStop(session: CallSession): Promise<void> {
  console.log(`[MediaStream] Call ended: ${session.streamSid}`);

  session.grokConnection?.close();
  session.grokConnection = null;

  if (!session.verified || !session.merchantId) return;

  const durationSeconds = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
  const outcome = deriveOutcome(session.toolsCalled);
  console.log(`[MediaStream] Call outcome: ${outcome} (tools: ${[...session.toolsCalled].join(', ') || 'none'})`);

  const transcriptText = session.transcript
    .map((t) => `${t.speaker}: ${t.text}`)
    .join('\n');

  try {
    await saveCallRecord({
      merchantId: session.merchantId,
      callerPhone: session.callerPhone,
      startedAt: session.startedAt,
      endedAt: new Date(),
      transcript: transcriptText,
      durationSeconds,
      outcome,
    });
  } catch (error) {
    console.error('[MediaStream] Failed to save call record:', error);
  }

  // Fire-and-forget: post-call processing (summary, customer, message linking)
  runPostCallProcessing({
    merchantId: session.merchantId,
    callerPhone: session.callerPhone,
    transcript: transcriptText,
    toolsCalled: session.toolsCalled,
  }).catch((err) => {
    console.error('[MediaStream] Post-call processing error:', err);
  });

  // Fire-and-forget: notify web app for overage tracking
  notifyCallComplete(session.merchantId);
}

function notifyCallComplete(merchantId: string): void {
  const appUrl = process.env['APP_URL'] || 'https://receptionaix-relay.vercel.app';
  const serviceKey = process.env['RELAY_SERVICE_KEY'];

  if (!serviceKey) {
    console.warn('[MediaStream] RELAY_SERVICE_KEY not set, skipping overage check');
    return;
  }

  fetch(`${appUrl}/api/calls/post-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ merchantId }),
    signal: AbortSignal.timeout(10_000),
  })
    .then((res) => {
      if (!res.ok) console.error(`[MediaStream] Post-complete failed: ${res.status}`);
      else console.log(`[MediaStream] Post-complete notified for ${merchantId}`);
    })
    .catch((err) => {
      console.error('[MediaStream] Post-complete error:', err);
    });
}

function sendToTwilio(session: CallSession, audioBase64: string): void {
  if (session.twilioWs.readyState !== WebSocket.OPEN) return;

  session.twilioWs.send(
    JSON.stringify({
      event: 'media',
      streamSid: session.streamSid,
      media: { payload: audioBase64 },
    })
  );
}

// Types for Twilio messages
interface TwilioStartMessage {
  event: 'start';
  start: {
    streamSid: string;
    callSid: string;
    customParameters?: {
      merchantId?: string;
      callerPhone?: string;
      token?: string;
      ts?: string;
    };
  };
}

interface TwilioMediaMessage {
  event: 'media';
  media: {
    payload: string;
    timestamp: string;
  };
}
