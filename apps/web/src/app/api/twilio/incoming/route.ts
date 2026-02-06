import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTierById } from '@/lib/stripe/config';

// Default call limit for trial merchants (Professional tier limits)
const TRIAL_CALL_LIMIT = 400;

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
  console.log('[Twilio Incoming] === REQUEST START ===');
  console.log('[Twilio Incoming] request.url:', request.url);
  console.log('[Twilio Incoming] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'NOT SET');
  console.log('[Twilio Incoming] TWILIO_AUTH_TOKEN set:', !!process.env.TWILIO_AUTH_TOKEN);
  console.log('[Twilio Incoming] SUPABASE_SERVICE_ROLE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('[Twilio Incoming] SUPABASE_SERVICE_ROLE_KEY starts with eyJ:', process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') || false);
  console.log('[Twilio Incoming] NODE_ENV:', process.env.NODE_ENV);

  // Parse Twilio webhook data
  const formData = await request.formData();

  // --- Twilio signature verification ---
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioSignature = request.headers.get('x-twilio-signature') || '';

  if (twilioAuthToken && process.env.NODE_ENV !== 'development') {
    // Build params object from form data
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Use the public URL for verification — on Vercel, request.url may
    // differ from the URL Twilio signed against (e.g. internal hostname).
    const publicUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/incoming`
      : request.url;

    console.log('[Twilio Incoming] Signature check — publicUrl:', publicUrl);
    console.log('[Twilio Incoming] Signature check — has signature:', !!twilioSignature);

    if (!verifyTwilioSignature(publicUrl, params, twilioSignature, twilioAuthToken)) {
      console.error('[Twilio Incoming] Invalid signature — rejecting request');
      console.error('[Twilio Incoming] publicUrl used:', publicUrl);
      console.error('[Twilio Incoming] request.url was:', request.url);
      return new NextResponse('Forbidden', { status: 403 });
    }
    console.log('[Twilio Incoming] Signature verified OK');
  } else if (!twilioAuthToken) {
    console.warn('[Twilio Incoming] TWILIO_AUTH_TOKEN not set — skipping signature verification');
  } else {
    console.log('[Twilio Incoming] Development mode — skipping signature verification');
  }

  const to = formData.get('To') as string; // The Twilio number called
  const from = formData.get('From') as string; // The caller's number

  console.log(`[Twilio Incoming] Call from ${from} to ${to}`);

  // Use admin client to bypass RLS since this is an external webhook
  console.log('[Twilio Incoming] Creating admin Supabase client...');
  console.log('[Twilio Incoming] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET');
  const supabase = createAdminClient();

  // Fetch merchant with subscription + billing fields
  console.log('[Twilio Incoming] Querying merchants for twilio_phone_number:', to);
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('id, business_name, plan_status, plan_tier, trial_ends_at, forward_phone, phone, billing_period_start')
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

  const fallbackPhone = merchant.forward_phone || merchant.phone;

  // --- Subscription validity check ---
  const status = merchant.plan_status as string;

  // Cancelled or expired → forward immediately
  if (status === 'cancelled' || status === 'expired') {
    console.log(`[Twilio Incoming] Subscription ${status} — forwarding to ${fallbackPhone || 'unavailable'}`);
    if (fallbackPhone) return forwardCall(fallbackPhone);
    return unavailableMessage();
  }

  // Trial with expired end date → forward
  if (status === 'trial' && merchant.trial_ends_at) {
    const trialEnd = new Date(merchant.trial_ends_at);
    if (trialEnd < new Date()) {
      console.log(`[Twilio Incoming] Trial expired — forwarding to ${fallbackPhone || 'unavailable'}`);
      if (fallbackPhone) return forwardCall(fallbackPhone);
      return unavailableMessage();
    }
  }

  // past_due → allow (grace period), active/trial → continue to limit check

  // --- Call limit check ---
  const tier = merchant.plan_tier ? getTierById(merchant.plan_tier) : null;
  const callLimit = tier ? tier.limits.callsPerMonth : TRIAL_CALL_LIMIT;
  const isUnlimited = callLimit === -1;

  if (!isUnlimited && merchant.billing_period_start) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usage, error: usageError } = await (supabase as any)
      .rpc('get_merchant_call_count', {
        p_merchant_id: merchant.id,
        p_period_start: merchant.billing_period_start,
      })
      .single();

    if (usageError) {
      console.error('[Twilio Incoming] Call count RPC error:', usageError);
      // On error, allow the call through rather than blocking
    } else if (usage && usage.call_count >= callLimit) {
      console.log(`[Twilio Incoming] Call limit reached (${usage.call_count}/${callLimit}) — forwarding to ${fallbackPhone || 'unavailable'}`);
      if (fallbackPhone) return forwardCall(fallbackPhone);
      return unavailableMessage();
    } else if (usage) {
      console.log(`[Twilio Incoming] Call usage: ${usage.call_count}/${callLimit}`);
    }
  }

  // --- Subscription valid, under limit → connect to AI relay ---
  const relayUrl = process.env.RELAY_URL || 'wss://receptionai-relay.fly.dev/media-stream';

  // Generate signed token for relay authentication
  const relayServiceKey = process.env.RELAY_SERVICE_KEY;
  const ts = Math.floor(Date.now() / 1000).toString();
  let streamUrl = relayUrl;

  if (relayServiceKey) {
    const token = createHmac('sha256', relayServiceKey)
      .update(`${merchant.id}:${from}:${ts}`)
      .digest('hex');
    streamUrl = `${relayUrl}?token=${token}&merchantId=${merchant.id}&callerPhone=${encodeURIComponent(from)}&ts=${ts}`;
  }

  const twiml = `  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="merchantId" value="${merchant.id}" />
      <Parameter name="callerPhone" value="${from}" />
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
