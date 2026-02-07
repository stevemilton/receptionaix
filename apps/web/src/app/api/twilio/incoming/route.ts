import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTierById } from '@/lib/stripe/config';

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

  // Fetch merchant — includes billing columns from migration 007
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('id, business_name, plan_status, plan_tier, phone, voice_id, greeting, forward_phone, billing_period_start, stripe_overage_item_id')
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

  // Cast to access columns from migration 007 (not yet in generated types)
  const m = merchant as Record<string, unknown>;
  const fallbackPhone = (m.forward_phone as string) || (merchant.phone as string);
  const planTier = (m.plan_tier as string) || 'starter';
  const billingPeriodStart = m.billing_period_start as string | null;
  const stripeOverageItemId = m.stripe_overage_item_id as string | null;

  // --- Subscription validity check ---
  const status = merchant.plan_status as string;

  // Cancelled or expired → forward immediately
  if (status === 'cancelled' || status === 'expired') {
    console.log(`[Twilio Incoming] Subscription ${status} — forwarding to ${fallbackPhone || 'unavailable'}`);
    if (fallbackPhone) return forwardCall(fallbackPhone);
    return unavailableMessage();
  }

  // --- Call-limit enforcement ---
  const tier = getTierById(planTier);

  // Enterprise or unknown tier → unlimited, always allow
  if (tier && tier.limits.callsPerMonth !== -1) {
    // Calculate billing period start
    const periodStart = billingPeriodStart
      ? new Date(billingPeriodStart)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    try {
      const { data: usageData, error: usageError } = await supabase
        .rpc('get_merchant_call_count', {
          p_merchant_id: merchant.id,
          p_period_start: periodStart.toISOString(),
        });

      if (!usageError && usageData) {
        const callCount = (usageData as { call_count: number }[])?.[0]?.call_count ?? 0;

        if (callCount >= tier.limits.callsPerMonth) {
          if (stripeOverageItemId) {
            // Has overage billing → allow the call (will be billed via post-call)
            console.log(`[Twilio Incoming] Over limit (${callCount}/${tier.limits.callsPerMonth}) but has overage billing — allowing`);
          } else {
            // No overage billing → forward to fallback phone
            console.log(`[Twilio Incoming] Call limit reached (${callCount}/${tier.limits.callsPerMonth}) — forwarding to ${fallbackPhone || 'unavailable'}`);
            if (fallbackPhone) return forwardCall(fallbackPhone);
            return unavailableMessage();
          }
        } else {
          console.log(`[Twilio Incoming] Call count ${callCount}/${tier.limits.callsPerMonth} — within limit`);
        }
      }
    } catch (rpcError) {
      // If the RPC fails (e.g. migration 007 not applied), allow the call through
      console.warn('[Twilio Incoming] Call count check failed, allowing call:', rpcError);
    }
  }

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
