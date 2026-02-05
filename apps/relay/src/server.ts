import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { createHmac } from 'crypto';
import { handleMediaStream } from './media-stream-handler.js';

// --- Startup env var validation ---
const REQUIRED_ENV = ['RELAY_SERVICE_KEY', 'GROK_API_KEY'] as const;
const REQUIRED_SUPABASE_ENV = ['SUPABASE_SERVICE_ROLE_KEY'] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[Relay] FATAL: Required env var ${key} is not set. Exiting.`);
    process.exit(1);
  }
}

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env['SUPABASE_URL'];
if (!supabaseUrl) {
  console.error('[Relay] FATAL: Neither NEXT_PUBLIC_SUPABASE_URL nor SUPABASE_URL is set. Exiting.');
  process.exit(1);
}

for (const key of REQUIRED_SUPABASE_ENV) {
  if (!process.env[key]) {
    console.error(`[Relay] FATAL: Required env var ${key} is not set. Exiting.`);
    process.exit(1);
  }
}

const server = Fastify({ logger: true });

await server.register(websocket);

// Health check for Fly.io
server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

/**
 * Verify HMAC-SHA256 signed token from the Twilio webhook.
 * Returns the verified merchantId if valid, null if invalid.
 */
function verifyRelayToken(url: URL): { merchantId: string; callerPhone: string } | null {
  const serviceKey = process.env['RELAY_SERVICE_KEY'];
  if (!serviceKey) {
    console.error('[Relay] RELAY_SERVICE_KEY not set — rejecting connection. Set this env var to enable relay authentication.');
    return null;
  }

  const token = url.searchParams.get('token');
  const merchantId = url.searchParams.get('merchantId');
  const callerPhone = url.searchParams.get('callerPhone') || '';
  const ts = url.searchParams.get('ts');

  if (!token || !merchantId || !ts) {
    console.error('[Relay] Missing token, merchantId, or ts in WebSocket URL');
    return null;
  }

  // Reject tokens older than 60 seconds
  const now = Math.floor(Date.now() / 1000);
  const tokenTime = parseInt(ts, 10);
  if (isNaN(tokenTime) || Math.abs(now - tokenTime) > 60) {
    console.error(`[Relay] Token expired: ts=${ts}, now=${now}`);
    return null;
  }

  // Verify HMAC signature (payload includes callerPhone)
  const expected = createHmac('sha256', serviceKey)
    .update(`${merchantId}:${callerPhone}:${ts}`)
    .digest('hex');

  if (expected.length !== token.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  if (mismatch !== 0) {
    console.error('[Relay] Invalid token signature');
    return null;
  }

  return { merchantId, callerPhone };
}

// WebSocket endpoint for Twilio Media Streams
server.get('/media-stream', { websocket: true }, (connection, request) => {
  // Verify signed token from URL query params
  const fullUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const verified = verifyRelayToken(fullUrl);

  if (!verified) {
    console.error('[Relay] Unauthorized WebSocket connection — closing');
    connection.socket.close(4401, 'Unauthorized');
    return;
  }

  handleMediaStream(connection.socket, verified.merchantId, verified.callerPhone);
});

const port = parseInt(process.env['PORT'] || '8080');
const host = process.env['HOST'] || '0.0.0.0';

try {
  await server.listen({ port, host });
  console.log(`Relay server running on ${host}:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
