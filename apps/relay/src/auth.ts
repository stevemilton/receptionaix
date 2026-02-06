import { createHmac } from 'crypto';

/**
 * Verify HMAC-SHA256 signed token from Twilio custom parameters.
 *
 * Twilio <Stream> strips query params from the WebSocket URL and instead
 * passes them as customParameters in the 'start' event. So verification
 * happens after connection, not at connection time.
 */
export function verifyRelayToken(params: {
  token?: string;
  merchantId?: string;
  callerPhone?: string;
  ts?: string;
}): { merchantId: string; callerPhone: string } | null {
  const serviceKey = process.env['RELAY_SERVICE_KEY'];
  if (!serviceKey) {
    console.error('[Relay] RELAY_SERVICE_KEY not set — rejecting.');
    return null;
  }

  const { token, merchantId, callerPhone = '', ts } = params;

  if (!token || !merchantId || !ts) {
    console.error('[Relay] Missing token, merchantId, or ts in parameters');
    return null;
  }

  // Reject tokens older than 60 seconds
  const now = Math.floor(Date.now() / 1000);
  const tokenTime = parseInt(ts, 10);
  if (isNaN(tokenTime) || Math.abs(now - tokenTime) > 60) {
    console.error(`[Relay] Token expired: ts=${ts}, now=${now}`);
    return null;
  }

  // Verify HMAC signature
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
