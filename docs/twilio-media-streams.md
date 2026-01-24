# Twilio Media Streams Skill

## Overview

Twilio Media Streams allows you to receive real-time audio from phone calls via WebSocket. This is used to pipe audio to AI voice services like Grok.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Media Stream** | Bidirectional WebSocket connection carrying audio |
| **TwiML** | XML response telling Twilio what to do with the call |
| **g711_ulaw** | Audio codec (8kHz, 8-bit, mono) — Twilio's native format |
| **Stream SID** | Unique identifier for the stream session |

---

## Step 1: Webhook Returns TwiML

When Twilio receives a call, it POSTs to your webhook. Return TwiML with `<Stream>`:

```typescript
// apps/web/app/api/twilio/incoming/route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const calledNumber = formData.get('Called') as string;

  // Look up merchant by Twilio number
  const merchant = await getMerchantByTwilioNumber(calledNumber);

  if (!merchant) {
    return new NextResponse(
      `<Response><Say>Sorry, this number is not configured.</Say></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  // Return TwiML pointing to your WebSocket relay
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://receptionai-relay.fly.dev/media-stream">
      <Parameter name="merchantId" value="${merchant.id}" />
      <Parameter name="callerPhone" value="${formData.get('From')}" />
    </Stream>
  </Connect>
</Response>`;

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' }
  });
}
```

---

## Step 2: Handle WebSocket Connection

Twilio connects to your WebSocket URL and sends messages:

```typescript
// apps/relay/src/twilio-handler.ts

import WebSocket from 'ws';

export function handleTwilioConnection(ws: WebSocket) {
  let streamSid: string | null = null;
  let merchantId: string | null = null;
  let callerPhone: string | null = null;

  ws.on('message', (data: Buffer) => {
    const message = JSON.parse(data.toString());

    switch (message.event) {
      case 'connected':
        // Twilio connected, waiting for start
        console.log('Twilio connected');
        break;

      case 'start':
        // Stream starting — extract parameters
        streamSid = message.start.streamSid;
        merchantId = message.start.customParameters?.merchantId;
        callerPhone = message.start.customParameters?.callerPhone;

        console.log(`Stream started: ${streamSid}`);
        console.log(`Merchant: ${merchantId}, Caller: ${callerPhone}`);

        // Now connect to Grok (see grok-realtime-api.md)
        break;

      case 'media':
        // Audio data from caller
        const audioChunk = message.media.payload; // Base64 g711_ulaw

        // Forward to Grok (see websocket-relay.md)
        break;

      case 'stop':
        // Stream ended
        console.log('Stream stopped');
        break;

      case 'mark':
        // Playback marker (for sync)
        console.log(`Mark: ${message.mark.name}`);
        break;
    }
  });

  ws.on('close', () => {
    console.log('Twilio disconnected');
  });
}
```

---

## Step 3: Send Audio Back to Twilio

To play audio to the caller, send `media` messages:

```typescript
function sendAudioToTwilio(ws: WebSocket, streamSid: string, audioBase64: string) {
  ws.send(JSON.stringify({
    event: 'media',
    streamSid: streamSid,
    media: {
      payload: audioBase64  // Base64 encoded g711_ulaw
    }
  }));
}
```

To mark a point in playback (for sync):

```typescript
function sendMark(ws: WebSocket, streamSid: string, markName: string) {
  ws.send(JSON.stringify({
    event: 'mark',
    streamSid: streamSid,
    mark: {
      name: markName
    }
  }));
}
```

To clear the audio queue (for interruptions):

```typescript
function clearAudioQueue(ws: WebSocket, streamSid: string) {
  ws.send(JSON.stringify({
    event: 'clear',
    streamSid: streamSid
  }));
}
```

---

## Message Types Reference

### Inbound (Twilio → You)

| Event | Description | Key Fields |
|-------|-------------|------------|
| `connected` | WebSocket connected | — |
| `start` | Stream starting | `streamSid`, `customParameters`, `callSid` |
| `media` | Audio chunk | `media.payload` (base64), `media.timestamp` |
| `stop` | Stream ending | — |
| `mark` | Playback marker reached | `mark.name` |

### Outbound (You → Twilio)

| Event | Description | Key Fields |
|-------|-------------|------------|
| `media` | Audio to play | `streamSid`, `media.payload` (base64) |
| `mark` | Set playback marker | `streamSid`, `mark.name` |
| `clear` | Clear audio queue | `streamSid` |

---

## Audio Format Details

| Property | Value |
|----------|-------|
| Codec | g711_ulaw (μ-law) |
| Sample Rate | 8000 Hz |
| Bit Depth | 8-bit |
| Channels | Mono |
| Encoding | Base64 |
| Chunk Size | ~20ms of audio per message |

**Important:** Do NOT transcode. Grok accepts g711_ulaw natively.

---

## Common Mistakes

### ❌ Hosting on Vercel
```
// WRONG - Vercel serverless times out after 10-60 seconds
export async function GET(request: Request) {
  // WebSocket upgrade won't work reliably
}
```

### ✅ Use a Long-Running Server
```typescript
// CORRECT - Node.js server on Fly.io/Railway
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', handleTwilioConnection);
```

### ❌ Forgetting streamSid
```typescript
// WRONG - Missing streamSid
ws.send(JSON.stringify({
  event: 'media',
  media: { payload: audio }
}));
```

### ✅ Always Include streamSid
```typescript
// CORRECT
ws.send(JSON.stringify({
  event: 'media',
  streamSid: streamSid,  // Required!
  media: { payload: audio }
}));
```

---

## Testing

### Use Twilio's Test Credentials
```bash
# .env.test
TWILIO_ACCOUNT_SID=ACtest...
TWILIO_AUTH_TOKEN=test...
```

### Use ngrok for Local Development
```bash
ngrok http 8080
# Use the ngrok URL in your TwiML: wss://abc123.ngrok.io/media-stream
```

### Test Audio Pipeline
1. Call your Twilio number
2. Verify `start` event received with correct parameters
3. Verify `media` events flowing
4. Send test audio back, verify you hear it
5. Hang up, verify `stop` event

---

## Environment Variables

```bash
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
RELAY_URL=wss://receptionai-relay.fly.dev/media-stream
```

---

## Further Reading

- [Twilio Media Streams Docs](https://www.twilio.com/docs/voice/media-streams)
- [TwiML <Stream> Reference](https://www.twilio.com/docs/voice/twiml/stream)
