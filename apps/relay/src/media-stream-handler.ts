import WebSocket from 'ws';
import { connectToGrok, type GrokConnection } from './grok-client.js';
import { connectToMockGrok, isMockModeEnabled } from './mock-grok-client.js';
import { executeToolCall } from './tool-handlers.js';
import { saveCallRecord } from './supabase-client.js';
import { convertTwilioToGrok, convertGrokToTwilio } from './audio-utils.js';

interface CallSession {
  streamSid: string;
  merchantId: string;
  callerPhone: string;
  twilioWs: WebSocket;
  grokConnection: GrokConnection | null;
  transcript: Array<{ speaker: 'user' | 'assistant'; text: string; timestamp: Date }>;
  startedAt: Date;
}

export function handleMediaStream(twilioWs: WebSocket, verifiedMerchantId: string, verifiedCallerPhone: string): void {
  const session: CallSession = {
    streamSid: '',
    merchantId: verifiedMerchantId,
    callerPhone: verifiedCallerPhone,
    twilioWs,
    grokConnection: null,
    transcript: [],
    startedAt: new Date(),
  };

  twilioWs.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.event) {
        case 'connected':
          console.log('Twilio connected');
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
          console.log(`Mark received: ${message.mark.name}`);
          break;
      }
    } catch (error) {
      console.error('Error handling Twilio message:', error);
    }
  });

  twilioWs.on('close', () => {
    console.log('Twilio disconnected');
    session.grokConnection?.close();
  });

  twilioWs.on('error', (error) => {
    console.error('Twilio WebSocket error:', error);
  });
}

async function handleStart(session: CallSession, message: TwilioStartMessage): Promise<void> {
  // Log the full start message to debug parameter passing
  console.log('[MediaStream] Full start message:', JSON.stringify(message, null, 2));

  session.streamSid = message.start.streamSid;
  // merchantId and callerPhone are already set from the verified HMAC token.
  // Do NOT fall back to unverified customParameters.

  console.log(`Call started: merchant=${session.merchantId}, caller=${session.callerPhone}`);

  try {
    const connectionOptions = {
      onAudio: (audioBase64: string) => {
        // Convert Grok's PCM16 24kHz to Twilio's μ-law 8kHz
        const convertedAudio = convertGrokToTwilio(audioBase64);
        sendToTwilio(session, convertedAudio);
      },
      onToolCall: async (toolName: string, params: Record<string, unknown>) => {
        return await executeToolCall(session.merchantId, toolName, params);
      },
      onTranscript: (text: string, speaker: 'user' | 'assistant') => {
        session.transcript.push({ speaker, text, timestamp: new Date() });
      },
      onError: (error: Error) => {
        console.error('Grok error:', error);
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
    console.error('Failed to connect to Grok:', error);
  }
}

function handleMedia(session: CallSession, message: TwilioMediaMessage): void {
  if (!session.grokConnection) return;

  // Convert Twilio's μ-law 8kHz to Grok's PCM16 24kHz
  const convertedAudio = convertTwilioToGrok(message.media.payload);
  session.grokConnection.sendAudio(convertedAudio);
}

async function handleStop(session: CallSession): Promise<void> {
  console.log(`Call ended: ${session.streamSid}`);

  session.grokConnection?.close();

  const durationSeconds = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

  try {
    await saveCallRecord({
      merchantId: session.merchantId,
      callerPhone: session.callerPhone,
      startedAt: session.startedAt,
      endedAt: new Date(),
      transcript: session.transcript
        .map((t) => `${t.speaker}: ${t.text}`)
        .join('\n'),
      durationSeconds,
    });
  } catch (error) {
    console.error('Failed to save call record:', error);
  }

  // Fire-and-forget: notify web app for overage tracking
  notifyCallComplete(session.merchantId);
}

function notifyCallComplete(merchantId: string): void {
  const appUrl = process.env['APP_URL'] || 'https://receptionai.vercel.app';
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
