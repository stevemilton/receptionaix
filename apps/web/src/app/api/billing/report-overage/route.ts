import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTierById } from '@/lib/stripe/config';
import { reportOverageUsage } from '@/lib/stripe/overage';

/**
 * POST /api/billing/report-overage
 *
 * Called by the relay server after each call completes.
 * Checks if the merchant has exceeded their plan's call limit,
 * and if so, reports a metered usage record to Stripe.
 *
 * Authenticated via RELAY_SERVICE_KEY (shared secret).
 */
export async function POST(request: Request) {
  // Authenticate via shared secret
  const relayServiceKey = process.env.RELAY_SERVICE_KEY;
  if (!relayServiceKey) {
    console.error('[ReportOverage] RELAY_SERVICE_KEY not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${relayServiceKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let merchantId: string;
  try {
    const body = await request.json();
    merchantId = body.merchantId;
    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId required' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch merchant billing info
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('id, plan_tier, billing_period_start, stripe_overage_item_id')
    .eq('id', merchantId)
    .single();

  if (merchantError || !merchant) {
    console.error('[ReportOverage] Merchant not found:', merchantId, merchantError);
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }

  // Cast to access columns from migration 007 (not yet in generated types)
  const m = merchant as Record<string, unknown>;
  const planTier = (m.plan_tier as string) || 'starter';
  const billingPeriodStart = m.billing_period_start as string | null;
  const stripeOverageItemId = m.stripe_overage_item_id as string | null;

  // No overage item → merchant doesn't have metered billing set up
  if (!stripeOverageItemId) {
    console.log(`[ReportOverage] No overage item for ${merchantId}, skipping`);
    return NextResponse.json({ reported: false, reason: 'no_overage_item' });
  }

  // Get tier limits
  const tier = getTierById(planTier);
  if (!tier) {
    console.error(`[ReportOverage] Unknown tier: ${planTier}`);
    return NextResponse.json({ reported: false, reason: 'unknown_tier' });
  }

  // Enterprise = unlimited, no overage
  if (tier.limits.callsPerMonth === -1) {
    return NextResponse.json({ reported: false, reason: 'unlimited' });
  }

  // Calculate billing period start
  const periodStart = billingPeriodStart
    ? new Date(billingPeriodStart)
    : getDefaultPeriodStart();

  // Get call count for current billing period
  const { data: usageData, error: usageError } = await supabase
    .rpc('get_merchant_call_count', {
      p_merchant_id: merchantId,
      p_period_start: periodStart.toISOString(),
    });

  if (usageError) {
    console.error('[ReportOverage] RPC error:', usageError);
    return NextResponse.json({ error: 'Usage query failed' }, { status: 500 });
  }

  const callCount = (usageData as { call_count: number }[])?.[0]?.call_count ?? 0;

  // Only report if over limit
  if (callCount <= tier.limits.callsPerMonth) {
    return NextResponse.json({
      reported: false,
      reason: 'within_limit',
      callCount,
      limit: tier.limits.callsPerMonth,
    });
  }

  // Report 1 overage unit to Stripe
  try {
    await reportOverageUsage(stripeOverageItemId, 1);
    console.log(
      `[ReportOverage] Reported overage for ${merchantId}: call ${callCount}/${tier.limits.callsPerMonth}`
    );
    return NextResponse.json({
      reported: true,
      callCount,
      limit: tier.limits.callsPerMonth,
    });
  } catch (stripeError) {
    console.error('[ReportOverage] Stripe error:', stripeError);
    return NextResponse.json({ error: 'Stripe reporting failed' }, { status: 500 });
  }
}

/**
 * Default billing period start: first day of current month.
 * Used when billing_period_start hasn't been set by Stripe webhook yet.
 */
function getDefaultPeriodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
