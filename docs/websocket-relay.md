# WebSocket Relay Server Skill

## Overview

A WebSocket relay bridges two services that need real-time bidirectional communication. For ReceptionAI, the relay connects Twilio Media Streams to Grok Voice API, forwarding audio in both directions.

## Why a Relay?

| Problem | Solution |
|---------|----------|
| Twilio can't connect directly to Grok | Relay bridges the two |
| Vercel serverless times out (10-60s) | Relay runs on Fly.io (persistent) |
| Need to execute tool calls mid-stream | Relay intercepts and handles them |
| Need to store transcripts after call | Relay POSTs to Supabase on end |

---

## Architecture

```
┌──────────┐         ┌─────────────────┐         ┌──────────┐
│  Twilio  │◀──WS───▶│  Relay Server   │◀──WS───▶│   Grok   │
│  Media   │         │                 │         │  Voice   │
│  Stream  │         │  - Audio pipe   │         │   API    │
└──────────┘         │  - Tool handler │         └──────────┘
                     │  - Transcript   │
                     └────────┬────────┘
                              │
                              ▼ HTTP
                     ┌──────────────────┐
                     │     Supabase     │
                     └──────────────────┘
```

---

## Project Setup

```bash
# apps/relay/package.json
{
  "name": "receptionai-relay",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "ws": "^8.16.0",
    "fastify": "^4.26.0",
    "@fastify/websocket": "^9.0.0",
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "@types/ws": "^8.5.10"
  }
}
```

---

## Server Implementation

### Entry Point

```typescript
// apps/relay/src/server.ts

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { handleMediaStream } from './media-stream-handler';

const server = Fastify({ logger: true });

await server.register(websocket);

// Health check for Fly.io
server.get('/health', async () => ({ status: 'ok' }));

// WebSocket endpoint for Twilio Media Streams
server.get('/media-stream', { websocket: true }, (connection, request) => {
  handleMediaStream(connection.socket);
});

const port = parseInt(process.env.PORT || '8080');
await server.listen({ port, host: '0.0.0.0' });

console.log(`Relay server running on port ${port}`);
```

### Media Stream Handler

```typescript
// apps/relay/src/media-stream-handler.ts

import WebSocket from 'ws';
import { connectToGrok, GrokConnection } from './grok-client';
import { executeToolCall } from './tool-handlers';
import { saveCallRecord } from './supabase-client';

interface CallSession {
  streamSid: string;
  merchantId: string;
  callerPhone: string;
  twilioWs: WebSocket;
  grokWs: GrokConnection | null;
  transcript: string[];
  startedAt: Date;
}

export function handleMediaStream(twilioWs: WebSocket) {
  const session: CallSession = {
    streamSid: '',
    merchantId: '',
    callerPhone: '',
    twilioWs,
    grokWs: null,
    transcript: [],
    startedAt: new Date()
  };

  twilioWs.on('message', async (data: Buffer) => {
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
    }
  });

  twilioWs.on('close', () => {
    console.log('Twilio disconnected');
    session.grokWs?.close();
  });

  twilioWs.on('error', (error) => {
    console.error('Twilio WebSocket error:', error);
  });
}

async function handleStart(session: CallSession, message: any) {
  session.streamSid = message.start.streamSid;
  session.merchantId = message.start.customParameters?.merchantId;
  session.callerPhone = message.start.customParameters?.callerPhone;

  console.log(`Call started: merchant=${session.merchantId}, caller=${session.callerPhone}`);

  // Connect to Grok with merchant config
  session.grokWs = await connectToGrok(session.merchantId, {
    onAudio: (audioBase64) => {
      // Forward Grok audio to Twilio
      sendToTwilio(session, audioBase64);
    },
    onToolCall: async (toolName, params) => {
      // Execute tool and return result
      return await executeToolCall(session.merchantId, toolName, params);
    },
    onTranscript: (text, speaker) => {
      session.transcript.push(`${speaker}: ${text}`);
    },
    onError: (error) => {
      console.error('Grok error:', error);
    }
  });
}

function handleMedia(session: CallSession, message: any) {
  if (!session.grokWs) return;

  // Forward Twilio audio to Grok
  const audioBase64 = message.media.payload;
  session.grokWs.sendAudio(audioBase64);
}

async function handleStop(session: CallSession) {
  console.log(`Call ended: ${session.streamSid}`);

  // Close Grok connection
  session.grokWs?.close();

  // Save call record to Supabase
  await saveCallRecord({
    merchantId: session.merchantId,
    callerPhone: session.callerPhone,
    startedAt: session.startedAt,
    endedAt: new Date(),
    transcript: session.transcript.join('\n'),
    durationSeconds: Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
  });
}

function sendToTwilio(session: CallSession, audioBase64: string) {
  if (session.twilioWs.readyState !== WebSocket.OPEN) return;

  session.twilioWs.send(JSON.stringify({
    event: 'media',
    streamSid: session.streamSid,
    media: { payload: audioBase64 }
  }));
}
```

---

## Tool Handlers

```typescript
// apps/relay/src/tool-handlers.ts

import { supabaseAdmin } from './supabase-client';
import { getCalendarSlots, createCalendarEvent } from './google-calendar';

export async function executeToolCall(
  merchantId: string,
  toolName: string,
  params: Record<string, any>
): Promise<any> {
  console.log(`Tool call: ${toolName}`, params);

  switch (toolName) {
    case 'lookupCustomer':
      return await lookupCustomer(merchantId, params.phone);

    case 'checkAvailability':
      return await checkAvailability(merchantId, params.date, params.service);

    case 'createBooking':
      return await createBooking(merchantId, params);

    case 'cancelBooking':
      return await cancelBooking(merchantId, params);

    case 'takeMessage':
      return await takeMessage(merchantId, params);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

async function lookupCustomer(merchantId: string, phone: string) {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('phone', phone)
    .single();

  if (error || !data) {
    return { found: false };
  }

  return {
    found: true,
    customer: {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email
    }
  };
}

async function checkAvailability(merchantId: string, date: string, service?: string) {
  // Get merchant's calendar token
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('google_calendar_token, settings')
    .eq('id', merchantId)
    .single();

  if (!merchant?.google_calendar_token) {
    return { error: 'Calendar not connected' };
  }

  // Get available slots from Google Calendar
  const slots = await getCalendarSlots(
    merchant.google_calendar_token,
    date,
    merchant.settings?.slotDuration || 30
  );

  return { slots };
}

async function createBooking(merchantId: string, params: any) {
  const { customerPhone, customerName, service, dateTime } = params;

  // Find or create customer
  let { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('phone', customerPhone)
    .single();

  if (!customer) {
    const { data: newCustomer } = await supabaseAdmin
      .from('customers')
      .insert({
        merchant_id: merchantId,
        phone: customerPhone,
        name: customerName
      })
      .select('id')
      .single();
    customer = newCustomer;
  }

  // Create appointment
  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .insert({
      merchant_id: merchantId,
      customer_id: customer!.id,
      service_name: service,
      start_time: dateTime,
      end_time: new Date(new Date(dateTime).getTime() + 30 * 60000).toISOString(),
      status: 'confirmed'
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Create Google Calendar event
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('google_calendar_token, business_name')
    .eq('id', merchantId)
    .single();

  if (merchant?.google_calendar_token) {
    const eventId = await createCalendarEvent(
      merchant.google_calendar_token,
      {
        summary: `${service} - ${customerName || customerPhone}`,
        start: dateTime,
        duration: 30
      }
    );

    await supabaseAdmin
      .from('appointments')
      .update({ google_event_id: eventId })
      .eq('id', appointment.id);
  }

  return {
    success: true,
    appointment: {
      id: appointment.id,
      service,
      dateTime,
      customerName: customerName || customerPhone
    }
  };
}

async function cancelBooking(merchantId: string, params: any) {
  const { customerPhone, appointmentDate } = params;

  // Find the appointment
  const query = supabaseAdmin
    .from('appointments')
    .select('id, google_event_id, customers!inner(phone)')
    .eq('merchant_id', merchantId)
    .eq('status', 'confirmed');

  if (appointmentDate) {
    query.gte('start_time', `${appointmentDate}T00:00:00`)
         .lt('start_time', `${appointmentDate}T23:59:59`);
  }

  const { data: appointments } = await query;

  const appointment = appointments?.find(
    a => (a.customers as any).phone === customerPhone
  );

  if (!appointment) {
    return { success: false, error: 'Appointment not found' };
  }

  // Update status
  await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointment.id);

  // Delete calendar event if exists
  if (appointment.google_event_id) {
    // TODO: Delete Google Calendar event
  }

  return { success: true };
}

async function takeMessage(merchantId: string, params: any) {
  const { callerName, callerPhone, message, urgency } = params;

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      merchant_id: merchantId,
      caller_name: callerName,
      caller_phone: callerPhone,
      content: message,
      urgency: urgency || 'medium',
      read: false
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data.id };
}
```

---

## Deployment to Fly.io

### fly.toml

```toml
# apps/relay/fly.toml

app = "receptionai-relay"
primary_region = "lhr"  # London for UK customers

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false  # Keep running for WebSocket connections
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]

[checks]
  [checks.health]
    port = 8080
    type = "http"
    interval = "10s"
    timeout = "2s"
    path = "/health"
```

### Dockerfile

```dockerfile
# apps/relay/Dockerfile

FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 8080

CMD ["node", "dist/server.js"]
```

### Deploy Commands

```bash
cd apps/relay

# First time setup
fly launch --name receptionai-relay

# Set secrets
fly secrets set \
  GROK_API_KEY=xxx \
  SUPABASE_URL=https://xxx.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=xxx \
  GOOGLE_CLIENT_ID=xxx \
  GOOGLE_CLIENT_SECRET=xxx

# Deploy
npm run build
fly deploy

# View logs
fly logs

# Scale (if needed)
fly scale count 2
```

---

## Error Handling

### Connection Drops

```typescript
// Handle Grok disconnect gracefully
grokWs.on('close', (code, reason) => {
  console.error(`Grok disconnected: ${code} - ${reason}`);

  // Play error message to caller
  sendToTwilio(session, generateErrorAudio(
    "I'm sorry, I'm having technical difficulties. Please call back."
  ));

  // End Twilio stream
  setTimeout(() => {
    twilioWs.close();
  }, 3000);  // Wait for audio to play
});

// Handle Twilio disconnect
twilioWs.on('close', () => {
  grokWs?.close();
  // Transcript will still be saved in handleStop
});
```

### Tool Failures

```typescript
async function executeToolCall(merchantId, toolName, params) {
  try {
    // ... execute tool
  } catch (error) {
    console.error(`Tool ${toolName} failed:`, error);

    // Return error that Grok can communicate to caller
    return {
      success: false,
      error: `I wasn't able to ${toolName}. Please try again.`
    };
  }
}
```

---

## Testing

### Local Development

```bash
# Terminal 1: Run relay
cd apps/relay
npm run dev

# Terminal 2: Use ngrok
ngrok http 8080
# Note the URL: wss://abc123.ngrok.io/media-stream

# Update Twilio webhook to use ngrok URL
```

### Mock Grok Connection

```typescript
// apps/relay/src/grok-client.mock.ts

export function connectToGrok(merchantId, handlers) {
  // Simulate Grok responses for testing
  setTimeout(() => {
    handlers.onAudio(generateTestAudio("Hello, how can I help you today?"));
  }, 500);

  return {
    sendAudio: (audio) => {
      // Echo back or simulate response
    },
    close: () => {}
  };
}
```

---

## Environment Variables

```bash
# .env
PORT=8080
GROK_API_KEY=xxx
GROK_REALTIME_URL=wss://api.x.ai/v1/realtime
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```
