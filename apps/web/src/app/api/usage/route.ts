import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTierById, type PricingTier } from '@/lib/stripe/config';

// Default limits for trial merchants (Professional tier)
const DEFAULT_CALLS_LIMIT = 400;
const DEFAULT_MINUTES_LIMIT = 1000;

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch merchant subscription data
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('plan_status, plan_tier, billing_period_start, trial_ends_at')
      .eq('id', user.id)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Determine tier and limits
    const tier: PricingTier | undefined = merchant.plan_tier
      ? getTierById(merchant.plan_tier)
      : undefined;

    const callsLimit = tier ? tier.limits.callsPerMonth : DEFAULT_CALLS_LIMIT;
    const minutesLimit = tier ? tier.limits.minutesPerMonth : DEFAULT_MINUTES_LIMIT;
    const overageRate = tier?.overageRate ?? 0.50;

    // Calculate billing period
    const periodStart = merchant.billing_period_start || merchant.trial_ends_at
      ? new Date(
          new Date(merchant.trial_ends_at || Date.now()).getTime() - 30 * 24 * 60 * 60 * 1000
        ).toISOString()
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // Get call count for billing period
    let callsUsed = 0;
    let minutesUsed = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usage, error: usageError } = await (supabase as any)
      .rpc('get_merchant_call_count', {
        p_merchant_id: user.id,
        p_period_start: periodStart,
      })
      .single();

    if (!usageError && usage) {
      callsUsed = usage.call_count || 0;
      minutesUsed = Math.round((usage.total_minutes || 0) * 10) / 10;
    }

    // Calculate overage
    const isUnlimited = callsLimit === -1;
    const overageCalls = isUnlimited ? 0 : Math.max(0, callsUsed - callsLimit);
    const overageCharges = overageCalls * overageRate;

    // Calculate billing period end (30 days from start)
    const periodStartDate = new Date(periodStart);
    const periodEndDate = merchant.trial_ends_at
      ? new Date(merchant.trial_ends_at)
      : new Date(periodStartDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get daily breakdown for the chart (last 30 days)
    const { data: dailyCalls } = await supabase
      .from('calls')
      .select('started_at, duration_seconds')
      .eq('merchant_id', user.id)
      .eq('status', 'completed')
      .gte('started_at', periodStart)
      .order('started_at', { ascending: true });

    // Group by day
    const dailyBreakdown: Record<string, { calls: number; minutes: number }> = {};
    if (dailyCalls) {
      for (const call of dailyCalls) {
        if (!call.started_at) continue;
        const day = new Date(call.started_at).toISOString().split('T')[0];
        if (!dailyBreakdown[day]) {
          dailyBreakdown[day] = { calls: 0, minutes: 0 };
        }
        dailyBreakdown[day].calls++;
        dailyBreakdown[day].minutes += (call.duration_seconds ?? 0) / 60;
      }
    }

    return NextResponse.json({
      callsUsed,
      callsLimit,
      minutesUsed,
      minutesLimit,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEndDate.toISOString(),
      tier: tier ? { id: tier.id, name: tier.name } : null,
      subscriptionStatus: merchant.plan_status,
      overageCalls,
      overageCharges,
      overageRate,
      isUnlimited,
      dailyBreakdown,
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
