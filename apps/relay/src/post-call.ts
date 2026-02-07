import { supabaseAdmin } from './supabase-client.js';

/**
 * Post-call processing: runs after a call record is saved.
 * 1. Auto-creates a customer from the caller phone (if not exists)
 * 2. Links the call to the customer
 * 3. Generates an AI summary from the transcript
 * 4. Links any messages created during the call to the call record
 * 5. Reports overage usage to Stripe (via Vercel API) if over call limit
 */

interface PostCallData {
  merchantId: string;
  callerPhone: string;
  callId?: string;
  transcript: string;
  toolsCalled: Set<string>;
}

/**
 * Run all post-call processing steps.
 * This is fire-and-forget from the media stream handler.
 */
export async function runPostCallProcessing(data: PostCallData): Promise<void> {
  const { merchantId, callerPhone, transcript, toolsCalled } = data;

  // Step 1: Find the call record we just saved (by merchant + caller + most recent)
  const callId = await findRecentCallId(merchantId, callerPhone);
  if (!callId) {
    console.error('[PostCall] Could not find recent call record');
    return;
  }

  // Step 2: Ensure customer exists and link to call
  const customerId = await ensureCustomer(merchantId, callerPhone);
  if (customerId) {
    await linkCallToCustomer(callId, customerId);
  }

  // Step 3: Generate AI summary from transcript
  await generateAndSaveSummary(callId, transcript);

  // Step 4: Link messages created during this call
  if (toolsCalled.has('takeMessage')) {
    await linkRecentMessages(merchantId, callerPhone, callId);
  }

  // Step 5: Report overage usage to Stripe (via Vercel API)
  await reportOverageIfNeeded(merchantId);

  console.log(`[PostCall] Processing complete for call ${callId}`);
}

async function findRecentCallId(merchantId: string, callerPhone: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('calls')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('caller_phone', callerPhone)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error('[PostCall] findRecentCallId error:', error);
    return null;
  }
  return data.id;
}

async function ensureCustomer(merchantId: string, phone: string): Promise<string | null> {
  // Check if customer already exists
  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('phone', phone)
    .single();

  if (existing) {
    // Update last_contact_at
    await supabaseAdmin
      .from('customers')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', existing.id);
    return existing.id;
  }

  // Create new customer
  const { data: newCustomer, error } = await supabaseAdmin
    .from('customers')
    .insert({
      merchant_id: merchantId,
      phone,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[PostCall] ensureCustomer insert error:', error);
    return null;
  }

  console.log(`[PostCall] Created new customer for ${phone}`);
  return newCustomer.id;
}

async function linkCallToCustomer(callId: string, customerId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('calls')
    .update({ customer_id: customerId })
    .eq('id', callId);

  if (error) {
    console.error('[PostCall] linkCallToCustomer error:', error);
  }
}

async function generateAndSaveSummary(callId: string, transcript: string): Promise<void> {
  if (!transcript || transcript.trim().length === 0) {
    return;
  }

  const apiKey = process.env['GROK_API_KEY'];
  if (!apiKey) {
    console.warn('[PostCall] No GROK_API_KEY, skipping summary generation');
    return;
  }

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini-fast',
        messages: [
          {
            role: 'system',
            content: `You are a call summariser for a business receptionist system. Given a call transcript between an AI receptionist (assistant) and a caller (user), produce a concise summary in 2-3 sentences. Include: the caller's purpose, any actions taken (bookings, cancellations, messages), and the outcome. Be factual and brief. Do not include any greeting or sign-off.`,
          },
          {
            role: 'user',
            content: `Summarise this call transcript:\n\n${transcript}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.error('[PostCall] Grok summary API error:', response.status);
      return;
    }

    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const summary = result.choices?.[0]?.message?.content?.trim();

    if (summary) {
      const { error } = await supabaseAdmin
        .from('calls')
        .update({ summary })
        .eq('id', callId);

      if (error) {
        console.error('[PostCall] Save summary error:', error);
      } else {
        console.log(`[PostCall] Summary saved for call ${callId}`);
      }
    }
  } catch (err) {
    console.error('[PostCall] Summary generation error:', err);
  }
}

async function reportOverageIfNeeded(merchantId: string): Promise<void> {
  const appUrl = process.env['APP_URL'] || 'https://receptionaix-relay.vercel.app';
  const relayServiceKey = process.env['RELAY_SERVICE_KEY'];

  if (!relayServiceKey) {
    console.warn('[PostCall] No RELAY_SERVICE_KEY, skipping overage report');
    return;
  }

  try {
    const response = await fetch(`${appUrl}/api/billing/report-overage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${relayServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ merchantId }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error('[PostCall] Overage report failed:', response.status);
      return;
    }

    const result = await response.json() as { reported?: boolean; reason?: string; callCount?: number };
    if (result.reported) {
      console.log(`[PostCall] Overage reported for ${merchantId} (call ${result.callCount})`);
    } else {
      console.log(`[PostCall] No overage: ${result.reason}`);
    }
  } catch (err) {
    console.error('[PostCall] Overage report error:', err);
  }
}

async function linkRecentMessages(merchantId: string, callerPhone: string, callId: string): Promise<void> {
  // Find messages created in the last 5 minutes for this caller that don't have a call_id
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('messages')
    .update({ call_id: callId })
    .eq('merchant_id', merchantId)
    .eq('caller_phone', callerPhone)
    .is('call_id', null)
    .gte('created_at', fiveMinutesAgo);

  if (error) {
    console.error('[PostCall] linkRecentMessages error:', error);
  } else {
    console.log(`[PostCall] Linked messages to call ${callId}`);
  }
}
