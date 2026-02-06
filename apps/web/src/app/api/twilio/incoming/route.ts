import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
// TODO: Re-enable billing enforcement after migration 007
// import { getTierById } from '@/lib/stripe/config';

/**
 * Verify Twilio webhook signature (HMAC-SHA1).
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  // 1. Start with the full URL
  let data = url;

  // 2. Sort POST params alphabetically, append key+value
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // 3. HMAC-SHA1 with auth token, base64 encode
  const expected = createHmac('sha1', authToken)
    .update(data, 'utf-8')
    .digest('base64');

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

function twimlResponse(twiml: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${twiml}\n</Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

function forwardCall(phone: string) {
  return twimlResponse(`  <Dial>${phone}</Dial>`);
}

function unavailableMessage() {
  return twimlResponse(
    `  <Say>The business is currently unavailable. Please try again later.</Say>\n  <Hangup/>`
  );
}

export async function POST(request: Request) {
  console.log('[Twilio Incoming] === REQUEST START (v2 - Parameter auth) ===');
  console.log('[Twilio Incoming] RELAY_SERVICE_KEY set:', !!process.env.RELAY_SERVICE_KEY);

  // Parse Twilio webhook data
  const formData = await request.formData();

  // --- Twilio signature verification ---
  // TODO: Re-enable signature verification after debugging
  // const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  // const twilioSignature = request.headers.get('x-twilio-signature') || '';

  const to = formData.get('To') as string; // The Twilio number called
  const from = formData.get('From') as string; // The caller's number

  console.log(`[Twilio Incoming] Call from ${from} to ${to}`);

  // Use admin client to bypass RLS since this is an external webhook
  const supabase = createAdminClient();

  // Fetch merchant — use only columns guaranteed to exist
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('id, business_name, plan_status, phone, voice_id, greeting')
    .eq('twilio_phone_number', to)
    .single();

  if (error || !merchant) {
    console.error('[Twilio Incoming] No merchant found for number:', to);
    console.error('[Twilio Incoming] Supabase error:', JSON.stringify(error));
    return twimlResponse(
      `  <Say>Sorry, this number is not configured. Please try again later.</Say>\n  <Hangup/>`
    );
  }

  console.log(`[Twilio Incoming] Merchant found: ${merchant.business_name} (${merchant.id}), status: ${merchant.plan_status}`);

  const fallbackPhone = merchant.phone;

  // --- Subscription validity check (simplified — billing columns may not exist yet) ---
  const status = merchant.plan_status as string;

  // Cancelled or expired → forward immediately
  if (status === 'cancelled' || status === 'expired') {
    console.log(`[Twilio Incoming] Subscription ${status} — forwarding to ${fallbackPhone || 'unavailable'}`);
    if (fallbackPhone) return forwardCall(fallbackPhone);
    return unavailableMessage();
  }

  // For now, allow all active/trial merchants through without call limit checks
  // TODO: Re-enable billing enforcement after migration 007 is applied
  console.log('[Twilio Incoming] Subscription check passed — connecting to relay');

  // --- Connect to AI relay ---
  const relayUrl = process.env.RELAY_URL || 'wss://receptionai-relay.fly.dev/media-stream';

  // Generate signed token for relay authentication
  // NOTE: Twilio <Stream> strips query params from the URL.
  // All params must be passed as <Parameter> elements instead —
  // they arrive in the 'start' event's customParameters object.
  const relayServiceKey = process.env.RELAY_SERVICE_KEY;
  const ts = Math.floor(Date.now() / 1000).toString();
  let token = '';

  if (relayServiceKey) {
    token = createHmac('sha256', relayServiceKey)
      .update(`${merchant.id}:${from}:${ts}`)
      .digest('hex');
  }

  const twiml = `  <Connect>
    <Stream url="${relayUrl}">
      <Parameter name="merchantId" value="${merchant.id}" />
      <Parameter name="callerPhone" value="${from || ''}" />
      <Parameter name="token" value="${token}" />
      <Parameter name="ts" value="${ts}" />
    </Stream>
  </Connect>`;

  return twimlResponse(twiml);
}

// Also handle GET for testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio incoming webhook endpoint'
  });
}
