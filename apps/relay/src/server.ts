import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { handleMediaStream } from './media-stream-handler.js';

const server = Fastify({ logger: true });

await server.register(websocket);

// Health check for Fly.io
server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// WebSocket endpoint for Twilio Media Streams
server.get('/media-stream', { websocket: true }, (connection) => {
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
