import WebSocket from 'ws';
import { getMerchantConfig } from './supabase-client.js';
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

  const ws = new WebSocket(process.env['GROK_REALTIME_URL'] || 'wss://api.x.ai/v1/realtime', {
    headers: {
      Authorization: `Bearer ${process.env['GROK_API_KEY']}`,
    },
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Grok connection timeout'));
    }, 10000);

    ws.on('open', () => {
      const connectionInit = createConnectionInit(config);
      ws.send(JSON.stringify(connectionInit));
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as GrokMessage;
        await handleGrokMessage(ws, message, options);

        if (message.type === 'connection_ack') {
          clearTimeout(timeout);
          resolve({
            sendAudio: (audio) => sendAudioToGrok(ws, audio),
            close: () => ws.close(),
          });
        }
      } catch (error) {
        console.error('Error handling Grok message:', error);
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      options.onError(error);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log(`Grok connection closed: ${code} - ${reason.toString()}`);
    });
  });
}

interface MerchantConfig {
  businessName: string;
  businessType: string;
  knowledgeBase: string;
  services: Array<{ name: string; duration: number; price: number }>;
  openingHours: Record<string, string>;
  greeting?: string;
}

function createConnectionInit(config: MerchantConfig) {
  return {
    type: 'connection_init',
    data: {
      model_id: 'grok-voice-beta',
      voice: {
        id: 'eve',
        speed: 1.0,
      },
      input_audio_format: 'g711_ulaw',
      output_audio_format: 'g711_ulaw',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      instructions: buildSystemPrompt(config),
      tools: RECEPTION_TOOLS,
      initial_message:
        config.greeting ||
        `Good ${getTimeOfDay()}, ${config.businessName}, how can I help you today?`,
    },
  };
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function buildSystemPrompt(config: MerchantConfig): string {
  return `You are a friendly, professional receptionist for ${config.businessName},
a ${config.businessType} in the UK.

YOUR CAPABILITIES:
- Book appointments by checking calendar availability
- Cancel or reschedule existing appointments
- Take messages for the business owner
- Answer questions about services and opening hours
- Transfer urgent calls to the owner's mobile

BUSINESS INFORMATION:
${config.knowledgeBase}

SERVICES OFFERED:
${config.services.map((s) => `- ${s.name}: ${s.duration} minutes, £${s.price}`).join('\n')}

OPENING HOURS:
${Object.entries(config.openingHours)
  .map(([day, hours]) => `- ${day}: ${hours}`)
  .join('\n')}

CONVERSATION RULES:
- Use British English
- Be warm but professional
- Always confirm booking details before creating
- If you can't help, offer to take a message
- For urgent matters, offer to transfer to the owner

HANDLING COMMON SCENARIOS:
- New booking: Ask for name, service, preferred date/time
- Cancellation: Confirm which appointment to cancel
- Rescheduling: Cancel old, create new
- Questions: Answer from knowledge base, or take message if unsure`;
}

interface GrokMessage {
  type: string;
  data: {
    audio?: string;
    text?: string;
    speaker?: 'user' | 'assistant';
    tool_call_id?: string;
    name?: string;
    arguments?: string;
    message?: string;
    code?: string;
    reason?: string;
  };
}

async function handleGrokMessage(
  ws: WebSocket,
  message: GrokMessage,
  options: GrokConnectionOptions
): Promise<void> {
  switch (message.type) {
    case 'connection_ack':
      console.log('Grok connection established');
      break;

    case 'output_audio':
      if (message.data.audio) {
        options.onAudio(message.data.audio);
      }
      break;

    case 'transcript':
      if (message.data.text && message.data.speaker) {
        options.onTranscript(message.data.text, message.data.speaker);
      }
      break;

    case 'tool_call':
      await handleToolCall(ws, message, options);
      break;

    case 'tool_call_cancelled':
      console.log(`Tool call cancelled: ${message.data.tool_call_id}`);
      break;

    case 'error':
      options.onError(new Error(message.data.message || 'Unknown Grok error'));
      break;

    case 'session_end':
      console.log(`Grok session ended: ${message.data.reason}`);
      break;
  }
}

async function handleToolCall(
  ws: WebSocket,
  message: GrokMessage,
  options: GrokConnectionOptions
): Promise<void> {
  const { tool_call_id, name, arguments: argsString } = message.data;

  if (!tool_call_id || !name) return;

  console.log(`Tool call: ${name}`, argsString);

  try {
    const params = argsString ? JSON.parse(argsString) : {};
    const result = await options.onToolCall(name, params);

    ws.send(
      JSON.stringify({
        type: 'tool_result',
        data: {
          tool_call_id,
          result: JSON.stringify(result),
        },
      })
    );
  } catch (error) {
    ws.send(
      JSON.stringify({
        type: 'tool_result',
        data: {
          tool_call_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    );
  }
}

function sendAudioToGrok(ws: WebSocket, audioBase64: string): void {
  if (ws.readyState !== WebSocket.OPEN) return;

  ws.send(
    JSON.stringify({
      type: 'input_audio',
      data: {
        audio: audioBase64,
      },
    })
  );
}
