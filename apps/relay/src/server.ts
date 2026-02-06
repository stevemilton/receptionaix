import Fastify from 'fastify';
import websocket from '@fastify/websocket';
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

// WebSocket endpoint for Twilio Media Streams
// Accept connection immediately — auth happens in the 'start' event
// because Twilio strips query params from the Stream URL and sends
// them as customParameters in the start message instead.
server.get('/media-stream', { websocket: true }, (connection) => {
  console.log('[Relay] New WebSocket connection — waiting for Twilio start event');
  handleMediaStream(connection.socket);
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
