import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  // Parse Twilio webhook data
  const formData = await request.formData();
  const to = formData.get('To') as string; // The Twilio number called
  const from = formData.get('From') as string; // The caller's number

  console.log(`[Twilio Incoming] Call from ${from} to ${to}`);

  // Look up merchant by their Twilio phone number
  // Use admin client to bypass RLS since this is an external webhook
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: merchant, error } = await (supabase as any)
    .from('merchants')
    .select('id, business_name')
    .eq('twilio_phone_number', to)
    .single();

  if (error || !merchant) {
    console.error('[Twilio Incoming] No merchant found for number:', to, error);
    // Return a fallback response
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, this number is not configured. Please try again later.</Say>
  <Hangup/>
</Response>`,
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }

  console.log(`[Twilio Incoming] Merchant found: ${merchant.business_name} (${merchant.id})`);

  // Get the relay URL from environment
  const relayUrl = process.env.RELAY_URL || 'wss://receptionai-relay.fly.dev/media-stream';

  // Return TwiML that connects to the relay server
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${relayUrl}">
      <Parameter name="merchantId" value="${merchant.id}" />
      <Parameter name="callerPhone" value="${from}" />
    </Stream>
  </Connect>
</Response>`;

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

// Also handle GET for testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio incoming webhook endpoint'
  });
}
