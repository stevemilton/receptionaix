# Grok Realtime Voice API Skill

## Overview

Grok Realtime is xAI's Audio-to-Audio API. Unlike traditional voice AI (STT → LLM → TTS), Grok processes audio natively, achieving sub-500ms latency.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Audio-to-Audio** | Grok receives raw audio, returns raw audio. No transcription step. |
| **WebSocket** | Persistent connection at `wss://api.x.ai/v1/realtime` |
| **g711_ulaw** | Audio codec (8kHz, 8-bit) — matches Twilio natively |
| **Server VAD** | Voice Activity Detection handled by Grok (detects speech/silence) |
| **Tool Calling** | Grok can call functions mid-conversation |

---

## Connection Flow

```
1. Open WebSocket to wss://api.x.ai/v1/realtime
2. Send connection_init with config + tools
3. Receive connection_ack
4. Stream audio bidirectionally
5. Handle tool_call messages
6. Receive session_end when done
```

---

## Step 1: Connect to Grok

```typescript
// packages/grok/src/client.ts

import WebSocket from 'ws';

export interface GrokConnectionOptions {
  onAudio: (audioBase64: string) => void;
  onToolCall: (name: string, params: any) => Promise<any>;
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
  // Fetch merchant config from Supabase
  const config = await getMerchantGrokConfig(merchantId);

  // Open WebSocket
  const ws = new WebSocket(process.env.GROK_REALTIME_URL!, {
    headers: {
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`
    }
  });

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      // Send connection_init
      ws.send(JSON.stringify(createConnectionInit(config)));
    });

    ws.on('message', async (data: Buffer) => {
      const message = JSON.parse(data.toString());
      await handleGrokMessage(ws, message, options);

      // Resolve on successful connection
      if (message.type === 'connection_ack') {
        resolve({
          sendAudio: (audio) => sendAudioToGrok(ws, audio),
          close: () => ws.close()
        });
      }
    });

    ws.on('error', (error) => {
      options.onError(error);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log(`Grok connection closed: ${code} - ${reason}`);
    });
  });
}
```

---

## Step 2: Connection Init Message

**This is the most critical message.** It configures the entire session.

```typescript
// packages/grok/src/connection-init.ts

import { RECEPTION_TOOLS } from './tools';

export function createConnectionInit(config: MerchantGrokConfig) {
  return {
    type: "connection_init",
    data: {
      // Model
      model_id: "grok-voice-beta",

      // Voice settings
      voice: {
        id: "eve",      // British female voice
        speed: 1.0      // Normal speed (0.5-2.0)
      },

      // Audio format - MUST match Twilio
      input_audio_format: "g711_ulaw",
      output_audio_format: "g711_ulaw",

      // Turn detection - let Grok handle it
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,           // Sensitivity (0-1)
        prefix_padding_ms: 300,   // Include audio before speech detected
        silence_duration_ms: 500  // How long silence = end of turn
      },

      // System instructions
      instructions: buildSystemPrompt(config),

      // Tools Grok can call
      tools: RECEPTION_TOOLS,

      // Initial greeting (optional)
      initial_message: config.greeting ||
        `Good ${getTimeOfDay()}, ${config.businessName}, how can I help you today?`
    }
  };
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function buildSystemPrompt(config: MerchantGrokConfig): string {
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
${config.services.map(s => `- ${s.name}: ${s.duration} minutes, £${s.price}`).join('\n')}

OPENING HOURS:
${Object.entries(config.openingHours).map(([day, hours]) => `- ${day}: ${hours}`).join('\n')}

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
```

---

## Step 3: Handle Grok Messages

```typescript
// packages/grok/src/message-handler.ts

export async function handleGrokMessage(
  ws: WebSocket,
  message: GrokMessage,
  options: GrokConnectionOptions
) {
  switch (message.type) {
    case 'connection_ack':
      console.log('Grok connection established');
      break;

    case 'output_audio':
      // Audio to play to caller
      options.onAudio(message.data.audio);
      break;

    case 'transcript':
      // Real-time transcript update
      options.onTranscript(
        message.data.text,
        message.data.speaker  // 'user' or 'assistant'
      );
      break;

    case 'tool_call':
      // Grok wants to execute a function
      await handleToolCall(ws, message, options);
      break;

    case 'tool_call_cancelled':
      // User interrupted, tool call cancelled
      console.log(`Tool call cancelled: ${message.data.tool_call_id}`);
      break;

    case 'error':
      options.onError(new Error(message.data.message));
      break;

    case 'session_end':
      console.log('Grok session ended');
      break;
  }
}

async function handleToolCall(
  ws: WebSocket,
  message: GrokMessage,
  options: GrokConnectionOptions
) {
  const { tool_call_id, name, arguments: params } = message.data;

  console.log(`Tool call: ${name}`, params);

  try {
    // Execute the tool
    const result = await options.onToolCall(name, JSON.parse(params));

    // Send result back to Grok
    ws.send(JSON.stringify({
      type: 'tool_result',
      data: {
        tool_call_id,
        result: JSON.stringify(result)
      }
    }));
  } catch (error) {
    // Send error back to Grok
    ws.send(JSON.stringify({
      type: 'tool_result',
      data: {
        tool_call_id,
        error: error.message
      }
    }));
  }
}
```

---

## Step 4: Send Audio to Grok

```typescript
// packages/grok/src/audio.ts

export function sendAudioToGrok(ws: WebSocket, audioBase64: string) {
  if (ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    type: 'input_audio',
    data: {
      audio: audioBase64  // Base64 encoded g711_ulaw
    }
  }));
}
```

---

## Tool Definitions

```typescript
// packages/grok/src/tools.ts

export const RECEPTION_TOOLS = [
  {
    name: "lookupCustomer",
    description: "Find an existing customer by their phone number. Call this when a caller mentions they're an existing customer or you need to look up their details.",
    parameters: {
      type: "object",
      properties: {
        phone: {
          type: "string",
          description: "Phone number in E.164 format (e.g., +447700900123)"
        }
      },
      required: ["phone"]
    }
  },
  {
    name: "checkAvailability",
    description: "Get available appointment slots for a specific date. Call this when a customer wants to book and you need to offer available times.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to check in YYYY-MM-DD format"
        },
        service: {
          type: "string",
          description: "Optional: specific service to check availability for"
        }
      },
      required: ["date"]
    }
  },
  {
    name: "createBooking",
    description: "Book an appointment for a customer. Only call this after confirming all details with the customer.",
    parameters: {
      type: "object",
      properties: {
        customerPhone: {
          type: "string",
          description: "Customer's phone number"
        },
        customerName: {
          type: "string",
          description: "Customer's name (required for new customers)"
        },
        service: {
          type: "string",
          description: "Name of the service to book"
        },
        dateTime: {
          type: "string",
          description: "Appointment start time in ISO 8601 format"
        }
      },
      required: ["customerPhone", "service", "dateTime"]
    }
  },
  {
    name: "cancelBooking",
    description: "Cancel an existing appointment. Confirm with the customer before calling.",
    parameters: {
      type: "object",
      properties: {
        customerPhone: {
          type: "string",
          description: "Phone number to find the booking"
        },
        appointmentDate: {
          type: "string",
          description: "Date of appointment to cancel (YYYY-MM-DD), if multiple exist"
        }
      },
      required: ["customerPhone"]
    }
  },
  {
    name: "takeMessage",
    description: "Record a message for the business owner. Use when you can't help directly or the caller requests to leave a message.",
    parameters: {
      type: "object",
      properties: {
        callerName: {
          type: "string",
          description: "Name of the person leaving the message"
        },
        callerPhone: {
          type: "string",
          description: "Phone number to call back"
        },
        message: {
          type: "string",
          description: "The message content"
        },
        urgency: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How urgent is this message"
        }
      },
      required: ["callerPhone", "message"]
    }
  }
];
```

---

## Message Types Reference

### Outbound (You → Grok)

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `connection_init` | Initialize session | `model_id`, `voice`, `input_audio_format`, `output_audio_format`, `instructions`, `tools` |
| `input_audio` | Audio from caller | `audio` (base64) |
| `tool_result` | Result of tool call | `tool_call_id`, `result` or `error` |

### Inbound (Grok → You)

| Type | Description | Fields |
|------|-------------|--------|
| `connection_ack` | Connection successful | — |
| `output_audio` | Audio to play | `audio` (base64) |
| `transcript` | Conversation text | `text`, `speaker` |
| `tool_call` | Function request | `tool_call_id`, `name`, `arguments` |
| `tool_call_cancelled` | Tool cancelled (interrupt) | `tool_call_id` |
| `error` | Error occurred | `message`, `code` |
| `session_end` | Session complete | `reason` |

---

## Audio Format Details

| Property | Value |
|----------|-------|
| Format | g711_ulaw (μ-law) |
| Sample Rate | 8000 Hz |
| Bit Depth | 8-bit |
| Channels | Mono |
| Encoding | Base64 |

**Why g711_ulaw?**
- Twilio Media Streams use g711_ulaw natively
- No transcoding = lower latency
- Grok accepts it directly

---

## Common Mistakes

### ❌ Missing Tools in Handshake
```typescript
// WRONG - tools not included
ws.send(JSON.stringify({
  type: 'connection_init',
  data: {
    model_id: 'grok-voice-beta',
    instructions: '...'
    // No tools! Grok can't call functions
  }
}));
```

### ✅ Always Include Tools
```typescript
// CORRECT
ws.send(JSON.stringify({
  type: 'connection_init',
  data: {
    model_id: 'grok-voice-beta',
    instructions: '...',
    tools: RECEPTION_TOOLS  // Required!
  }
}));
```

### ❌ Wrong Audio Format
```typescript
// WRONG - Grok expects g711_ulaw
data: {
  input_audio_format: 'pcm16',  // Wrong!
  output_audio_format: 'mp3'     // Wrong!
}
```

### ✅ Match Twilio Format
```typescript
// CORRECT - native Twilio format
data: {
  input_audio_format: 'g711_ulaw',
  output_audio_format: 'g711_ulaw'
}
```

### ❌ Forgetting tool_call_id
```typescript
// WRONG - missing tool_call_id
ws.send(JSON.stringify({
  type: 'tool_result',
  data: {
    result: '{"success": true}'  // Which tool call??
  }
}));
```

### ✅ Always Include tool_call_id
```typescript
// CORRECT
ws.send(JSON.stringify({
  type: 'tool_result',
  data: {
    tool_call_id: message.data.tool_call_id,  // Required!
    result: '{"success": true}'
  }
}));
```

---

## Handling Interruptions

Grok uses Server VAD (Voice Activity Detection). When the user interrupts:

1. Grok detects speech during assistant output
2. Grok stops generating audio
3. If a tool was in progress, sends `tool_call_cancelled`
4. Grok processes new user input

```typescript
case 'tool_call_cancelled':
  // User interrupted while tool was executing
  // Don't send tool_result - it's already cancelled
  console.log(`Tool cancelled: ${message.data.tool_call_id}`);
  break;
```

---

## Error Handling

```typescript
ws.on('message', async (data) => {
  const message = JSON.parse(data.toString());

  if (message.type === 'error') {
    console.error('Grok error:', message.data);

    switch (message.data.code) {
      case 'rate_limit':
        // Too many requests - back off
        break;
      case 'invalid_audio':
        // Audio format issue
        break;
      case 'tool_error':
        // Tool definition problem
        break;
      default:
        // Unknown error
    }
  }
});

ws.on('close', (code, reason) => {
  // Connection closed
  if (code !== 1000) {
    console.error(`Unexpected close: ${code} - ${reason}`);
    // Attempt reconnect or graceful degradation
  }
});
```

---

## Testing

### Mock Grok for Development

```typescript
// packages/grok/src/client.mock.ts

export async function connectToGrok(merchantId, options): Promise<GrokConnection> {
  // Simulate connection delay
  await new Promise(r => setTimeout(r, 100));

  // Simulate greeting
  setTimeout(() => {
    options.onAudio(generateTestAudio("Hello, how can I help you today?"));
  }, 500);

  return {
    sendAudio: (audio) => {
      // Simulate response after "hearing" audio
      setTimeout(() => {
        options.onAudio(generateTestAudio("I understand. Let me help you with that."));
      }, 1000);
    },
    close: () => {}
  };
}
```

### Test Tool Calling

```typescript
// Simulate a tool call
const testToolCall = {
  type: 'tool_call',
  data: {
    tool_call_id: 'test-123',
    name: 'checkAvailability',
    arguments: JSON.stringify({ date: '2026-01-25' })
  }
};

await handleGrokMessage(mockWs, testToolCall, options);
// Verify tool_result was sent back
```

---

## Environment Variables

```bash
GROK_API_KEY=xxx
GROK_REALTIME_URL=wss://api.x.ai/v1/realtime
```

---

## Rate Limits & Pricing

| Metric | Limit |
|--------|-------|
| Concurrent connections | TBD (beta) |
| Audio duration | TBD (beta) |
| Tool calls per session | No limit |

**Note:** Grok Realtime is in beta. Check xAI docs for current limits.
