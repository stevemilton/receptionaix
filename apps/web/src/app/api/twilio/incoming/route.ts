import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTierById } from '@/lib/stripe/config';

// Default call limit for trial merchants (Professional tier limits)
const TRIAL_CALL_LIMIT = 400;

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
  // Parse Twilio webhook data
  const formData = await request.formData();
  const to = formData.get('To') as string; // The Twilio number called
  const from = formData.get('From') as string; // The caller's number

  console.log(`[Twilio Incoming] Call from ${from} to ${to}`);

  // Use admin client to bypass RLS since this is an external webhook
  const supabase = createAdminClient();

  // Fetch merchant with subscription + billing fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: merchant, error } = await (supabase as any)
    .from('merchants')
    .select('id, business_name, subscription_status, subscription_tier, subscription_ends_at, forward_phone, phone, billing_period_start')
    .eq('twilio_phone_number', to)
    .single();

  if (error || !merchant) {
    console.error('[Twilio Incoming] No merchant found for number:', to, error);
    return twimlResponse(
      `  <Say>Sorry, this number is not configured. Please try again later.</Say>\n  <Hangup/>`
    );
  }

  console.log(`[Twilio Incoming] Merchant found: ${merchant.business_name} (${merchant.id}), status: ${merchant.subscription_status}`);

  const fallbackPhone = merchant.forward_phone || merchant.phone;

  // --- Subscription validity check ---
  const status = merchant.subscription_status as string;

  // Cancelled or expired → forward immediately
  if (status === 'cancelled' || status === 'expired') {
    console.log(`[Twilio Incoming] Subscription ${status} — forwarding to ${fallbackPhone || 'unavailable'}`);
    if (fallbackPhone) return forwardCall(fallbackPhone);
    return unavailableMessage();
  }

  // Trial with expired end date → forward
  if (status === 'trial' && merchant.subscription_ends_at) {
    const trialEnd = new Date(merchant.subscription_ends_at);
    if (trialEnd < new Date()) {
      console.log(`[Twilio Incoming] Trial expired — forwarding to ${fallbackPhone || 'unavailable'}`);
      if (fallbackPhone) return forwardCall(fallbackPhone);
      return unavailableMessage();
    }
  }

  // past_due → allow (grace period), active/trial → continue to limit check

  // --- Call limit check ---
  const tier = merchant.subscription_tier ? getTierById(merchant.subscription_tier) : null;
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

  const twiml = `  <Connect>
    <Stream url="${relayUrl}">
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
