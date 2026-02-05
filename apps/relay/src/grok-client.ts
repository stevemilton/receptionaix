import WebSocket from 'ws';
import { getMerchantConfig, type MerchantConfig } from './supabase-client.js';
import { RECEPTION_TOOLS } from '@receptionalx/grok';

export interface GrokConnectionOptions {
  onAudio: (audioBase64: string) => void;
  onToolCall: (name: string, params: Record<string, unknown>) => Promise<unknown>;
  onTranscript: (text: string, speaker: 'user' | 'assistant') => void;
  onError: (error: Error) => void;
}

export interface GrokConnection {
  sendAudio: (audioBase64: string) => void;
  close: () => void;
}

export async function connectToGrok(
  merchantId: string,
  options: GrokConnectionOptions
): Promise<GrokConnection> {
  const config = await getMerchantConfig(merchantId);

  // Grok Voice Agent API uses OpenAI Realtime API format
  // Connect with model query param as per xAI docs
  const wsUrl = process.env['GROK_REALTIME_URL'] || 'wss://api.x.ai/v1/realtime?model=grok-2-public';

  console.log('[Grok] Connecting to:', wsUrl);

  // Per-connection flag so we log the first audio chunk of each call
  let audioLogged = false;

  const ws = new WebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${process.env['GROK_API_KEY']}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Grok connection timeout'));
    }, 10000);

    ws.on('open', () => {
      console.log('[Grok] WebSocket connected, sending session.update');

      // Send session configuration using OpenAI Realtime API format
      const sessionUpdate = createSessionUpdate(config);
      ws.send(JSON.stringify(sessionUpdate));
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[Grok] Received:', message.type);

        await handleGrokMessage(ws, message, options, () => audioLogged, () => { audioLogged = true; });

        // Session created = connection ready
        if (message.type === 'session.created' || message.type === 'session.updated') {
          clearTimeout(timeout);

          // Send initial greeting using response.create
          sendInitialGreeting(ws, config);

          resolve({
            sendAudio: (audio) => sendAudioToGrok(ws, audio),
            close: () => ws.close(),
          });
        }
      } catch (error) {
        console.error('[Grok] Error handling message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('[Grok] WebSocket error:', error);
      clearTimeout(timeout);
      ws.close();
      options.onError(error);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log(`[Grok] Connection closed: ${code} - ${reason.toString()}`);
    });
  });
}

// OpenAI Realtime API format for session configuration
function createSessionUpdate(config: MerchantConfig) {
  // Convert tools to OpenAI function format
  const tools = RECEPTION_TOOLS.map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));

  // Map user-friendly voice names to xAI voice IDs
  // xAI supports: alloy, ash, ballad, coral, echo, sage, shimmer, verse
  const voiceMap: Record<string, string> = {
    'ara': 'alloy',
    'rex': 'echo',
    'sal': 'shimmer',
    'eve': 'coral',
    'leo': 'ash',
  };
  const voice = voiceMap[config.voiceId?.toLowerCase() || 'ara'] || 'alloy';

  // xAI Grok uses PCM16 at 24kHz - NOT g711_ulaw
  // We must convert between Twilio's μ-law 8kHz and Grok's PCM16 24kHz
  return {
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      instructions: buildSystemPrompt(config),
      voice,
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'grok-2',
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 1200,
      },
      tools,
      tool_choice: 'auto',
      temperature: 0.8,
    },
  };
}

function sendInitialGreeting(ws: WebSocket, config: MerchantConfig) {
  const greeting = config.greeting ||
    `Good ${getTimeOfDay()}, thank you for calling ${config.businessName}. How can I help you today?`;

  console.log('[Grok] Sending initial greeting:', greeting);
  console.log('[Grok] Config business name:', config.businessName);
  console.log('[Grok] Opening hours:', JSON.stringify(config.openingHours));
  console.log('[Grok] Services count:', config.services.length);
  console.log('[Grok] FAQs count:', config.faqs.length);
  console.log('[Grok] Address:', config.address);

  // Create a response with the initial greeting
  ws.send(JSON.stringify({
    type: 'response.create',
    response: {
      modalities: ['text', 'audio'],
      instructions: `Say exactly: "${greeting}"`,
    },
  }));
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function buildSystemPrompt(config: MerchantConfig): string {
  // Build services section with descriptions where available
  const servicesText = config.services.length > 0
    ? config.services.map((s) => {
        const parts = [`- ${s.name}`];
        if (s.duration) parts.push(`${s.duration} minutes`);
        if (s.price) parts.push(`£${s.price}`);
        if (s.description) parts.push(`(${s.description})`);
        return parts.join(', ');
      }).join('\n')
    : '- No specific services listed. Ask the business owner for details.';

  // Build opening hours section
  const hoursText = Object.keys(config.openingHours).length > 0
    ? Object.entries(config.openingHours)
        .map(([day, hours]) => `- ${day}: ${hours}`)
        .join('\n')
    : '- Opening hours not specified. Offer to take a message if asked.';

  // Build FAQs section
  const faqsText = config.faqs.length > 0
    ? config.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
    : '';

  // Build business details section
  const businessDetails: string[] = [];
  if (config.address) businessDetails.push(`Address: ${config.address}`);
  if (config.phone) businessDetails.push(`Business Phone: ${config.phone}`);
  if (config.knowledgeBase) businessDetails.push(config.knowledgeBase);

  const prompt = `You are a friendly, professional receptionist for ${config.businessName},
a ${config.businessType} in the UK.

YOUR CAPABILITIES:
- Book appointments by checking calendar availability
- Cancel or reschedule existing appointments
- Take messages for the business owner
- Answer questions about services, opening hours, and the business
- Transfer urgent calls to the owner's mobile

BUSINESS INFORMATION:
${businessDetails.length > 0 ? businessDetails.join('\n') : 'No additional business details available.'}

SERVICES OFFERED:
${servicesText}

OPENING HOURS:
${hoursText}
${faqsText ? `
FREQUENTLY ASKED QUESTIONS:
Use these to answer common questions callers may have:

${faqsText}` : ''}

CONVERSATION RULES:
- Use British English
- Be warm but professional
- Always confirm booking details before creating
- If you can't help, offer to take a message
- For urgent matters, offer to transfer to the owner
- When asked about services, prices, or hours, ALWAYS refer to the information above
- If asked a question that matches an FAQ, use that answer

HANDLING COMMON SCENARIOS:
- New booking: Ask for name, service, preferred date/time
- Cancellation: Confirm which appointment to cancel
- Rescheduling: Cancel old, create new
- Questions: Answer from the knowledge base above, or take a message if unsure`;

  // Log the full prompt for debugging
  console.log('[Grok] System prompt being sent:');
  console.log('=== PROMPT START ===');
  console.log(prompt);
  console.log('=== PROMPT END ===');

  return prompt;
}

// OpenAI Realtime API message types
interface RealtimeMessage {
  type: string;
  event_id?: string;
  session?: Record<string, unknown>;
  response?: Record<string, unknown>;
  delta?: string;
  audio?: string;
  transcript?: string;
  text?: string;
  item?: {
    id?: string;
    type?: string;
    role?: string;
    content?: Array<{
      type: string;
      text?: string;
      transcript?: string;
      audio?: string;
    }>;
  };
  item_id?: string;
  output_index?: number;
  content_index?: number;
  call_id?: string;
  name?: string;
  arguments?: string;
  error?: {
    type: string;
    code: string;
    message: string;
  };
}

async function handleGrokMessage(
  ws: WebSocket,
  message: RealtimeMessage,
  options: GrokConnectionOptions,
  isAudioLogged: () => boolean,
  markAudioLogged: () => void
): Promise<void> {
  switch (message.type) {
    case 'session.created':
      console.log('[Grok] Session created');
      break;

    case 'session.updated':
      // Log the actual session config to verify audio format was accepted
      console.log('[Grok] Session updated:', JSON.stringify(message.session || message, null, 2));
      break;

    case 'response.audio.delta': {
      // Audio chunk received - send to Twilio
      // The audio might be in message.delta or message.audio depending on API version
      const audioData = message.delta || message.audio;
      if (audioData) {
        // Log first audio chunk per connection to verify format
        if (!isAudioLogged()) {
          console.log('[Grok] Full audio.delta message keys:', Object.keys(message));
          console.log('[Grok] First audio sample (first 100 chars):', audioData.substring(0, 100));
          console.log('[Grok] Audio length:', audioData.length);
          markAudioLogged();
        }
        options.onAudio(audioData);
      }
      break;
    }

    case 'response.audio_transcript.delta':
      // Assistant transcript chunk
      if (message.delta) {
        options.onTranscript(message.delta, 'assistant');
      }
      break;

    case 'conversation.item.input_audio_transcription.completed':
      // User speech transcription completed
      if (message.transcript) {
        options.onTranscript(message.transcript, 'user');
      }
      break;

    case 'response.function_call_arguments.done':
      // Tool call completed - execute it
      await handleToolCall(ws, message, options);
      break;

    case 'response.done':
      console.log('[Grok] Response completed');
      break;

    case 'input_audio_buffer.speech_started':
      console.log('[Grok] User started speaking');
      break;

    case 'input_audio_buffer.speech_stopped':
      console.log('[Grok] User stopped speaking');
      break;

    case 'error':
      console.error('[Grok] Error:', message.error);
      options.onError(new Error(message.error?.message || 'Unknown Grok error'));
      break;

    default:
      // Log unknown message types for debugging
      if (!message.type.startsWith('response.') && !message.type.startsWith('input_audio_buffer')) {
        console.log('[Grok] Unhandled message type:', message.type);
      }
  }
}

async function handleToolCall(
  ws: WebSocket,
  message: RealtimeMessage,
  options: GrokConnectionOptions
): Promise<void> {
  const { call_id, name, arguments: argsString } = message;

  if (!call_id || !name) return;

  console.log(`[Grok] Tool call: ${name}`, argsString);

  try {
    const params = argsString ? JSON.parse(argsString) : {};
    const result = await options.onToolCall(name, params);

    // Send tool result using OpenAI format
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id,
        output: JSON.stringify(result),
      },
    }));

    // Trigger response generation after tool result
    ws.send(JSON.stringify({
      type: 'response.create',
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id,
        output: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      },
    }));

    ws.send(JSON.stringify({
      type: 'response.create',
    }));
  }
}

function sendAudioToGrok(ws: WebSocket, audioBase64: string): void {
  if (ws.readyState !== WebSocket.OPEN) return;

  // OpenAI Realtime API format for audio input
  ws.send(JSON.stringify({
    type: 'input_audio_buffer.append',
    audio: audioBase64,
  }));
}
