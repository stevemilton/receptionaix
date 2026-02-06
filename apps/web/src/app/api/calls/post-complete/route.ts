import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTierById } from '@/lib/stripe/config';
import { reportOverageUsage } from '@/lib/stripe/overage';

/**
 * Called by the relay server after a call completes.
 * Checks if the merchant has exceeded their call limit and reports overage to Stripe.
 */
export async function POST(request: NextRequest) {
  // Verify relay service key
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.RELAY_SERVICE_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { merchantId } = await request.json();

    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = createAdminClient();

    // Fetch merchant subscription data
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('plan_tier, billing_period_start, stripe_overage_item_id')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant) {
      console.error('[PostComplete] Merchant not found:', merchantId, merchantError);
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // No overage tracking if no subscription item or no billing period
    if (!merchant.stripe_overage_item_id || !merchant.billing_period_start) {
      return NextResponse.json({ overage: false, reason: 'no_overage_tracking' });
    }

    const tier = merchant.plan_tier
      ? getTierById(merchant.plan_tier)
      : null;

    // Unlimited tier — no overage
    if (tier && tier.limits.callsPerMonth === -1) {
      return NextResponse.json({ overage: false, reason: 'unlimited' });
    }

    const callLimit = tier ? tier.limits.callsPerMonth : 400;

    // Get current call count
    const { data: usage, error: usageError } = await supabase
      .rpc('get_merchant_call_count', {
        p_merchant_id: merchantId,
        p_period_start: merchant.billing_period_start,
      })
      .single();

    if (usageError || !usage) {
      console.error('[PostComplete] Usage RPC error:', usageError);
      return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 });
    }

    const callCount = (usage as { call_count: number }).call_count || 0;

    // If over limit, report 1 overage unit to Stripe
    if (callCount > callLimit) {
      try {
        await reportOverageUsage(merchant.stripe_overage_item_id, 1);
        console.log(`[PostComplete] Overage reported for ${merchantId}: call ${callCount}/${callLimit}`);
        return NextResponse.json({ overage: true, callCount, callLimit });
      } catch (stripeError) {
        console.error('[PostComplete] Stripe overage error:', stripeError);
        return NextResponse.json({ error: 'Stripe overage failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ overage: false, callCount, callLimit });
  } catch (error) {
    console.error('[PostComplete] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
