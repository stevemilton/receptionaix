import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/client';
import { trialExpiringEmail } from '@/lib/email/templates/trial-expiring';
import { trialExpiredEmail } from '@/lib/email/templates/trial-expired';
import { usageWarningEmail } from '@/lib/email/templates/usage-warning';
import { usageExceededEmail } from '@/lib/email/templates/usage-exceeded';
import { getTierById } from '@/lib/stripe/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://receptionai.vercel.app';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel Cron sends this header)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not set — rejecting request');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] Running notification check...');

  const results = {
    trialExpiring: 0,
    trialExpired: 0,
    usageWarning: 0,
    usageExceeded: 0,
    errors: 0,
  };

  try {
    // --- Trial expiring (3 days and 1 day) ---
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const { data: trialMerchants } = await supabase
      .from('merchants')
      .select('id, email, business_name, subscription_ends_at')
      .eq('subscription_status', 'trial')
      .not('subscription_ends_at', 'is', null);

    if (trialMerchants) {
      for (const merchant of trialMerchants) {
        const endDate = new Date(merchant.subscription_ends_at);
        const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilEnd <= 0) {
          // Trial expired
          if (await shouldNotify(merchant.id, 'trial_expired')) {
            try {
              const { subject, html } = trialExpiredEmail({
                businessName: merchant.business_name,
                billingUrl: `${APP_URL}/dashboard/billing?expired=true`,
              });
              await sendEmail({ to: merchant.email, subject, html });
              await logNotification(merchant.id, 'trial_expired');
              results.trialExpired++;
            } catch (e) {
              console.error(`[Cron] Failed to send trial expired email to ${merchant.email}:`, e);
              results.errors++;
            }
          }
        } else if (daysUntilEnd <= 1 && daysUntilEnd > 0) {
          if (await shouldNotify(merchant.id, 'trial_expiring_1d')) {
            try {
              const { subject, html } = trialExpiringEmail({
                businessName: merchant.business_name,
                daysRemaining: 1,
                billingUrl: `${APP_URL}/dashboard/billing`,
              });
              await sendEmail({ to: merchant.email, subject, html });
              await logNotification(merchant.id, 'trial_expiring_1d');
              results.trialExpiring++;
            } catch (e) {
              console.error(`[Cron] Failed to send trial expiring email to ${merchant.email}:`, e);
              results.errors++;
            }
          }
        } else if (daysUntilEnd <= 3 && daysUntilEnd > 1) {
          if (await shouldNotify(merchant.id, 'trial_expiring_3d')) {
            try {
              const { subject, html } = trialExpiringEmail({
                businessName: merchant.business_name,
                daysRemaining: daysUntilEnd,
                billingUrl: `${APP_URL}/dashboard/billing`,
              });
              await sendEmail({ to: merchant.email, subject, html });
              await logNotification(merchant.id, 'trial_expiring_3d');
              results.trialExpiring++;
            } catch (e) {
              console.error(`[Cron] Failed to send trial expiring email to ${merchant.email}:`, e);
              results.errors++;
            }
          }
        }
      }
    }

    // --- Usage warnings (80%+ of call limit) ---
    const { data: activeMerchants } = await supabase
      .from('merchants')
      .select('id, email, business_name, subscription_tier, billing_period_start')
      .in('subscription_status', ['active', 'trial'])
      .not('billing_period_start', 'is', null);

    if (activeMerchants) {
      for (const merchant of activeMerchants) {
        const tier = merchant.subscription_tier
          ? getTierById(merchant.subscription_tier)
          : null;

        const callLimit = tier ? tier.limits.callsPerMonth : 400;
        if (callLimit === -1) continue; // Unlimited

        const { data: usage } = await supabase
          .rpc('get_merchant_call_count', {
            p_merchant_id: merchant.id,
            p_period_start: merchant.billing_period_start,
          })
          .single();

        if (!usage) continue;

        const callCount = (usage as { call_count: number }).call_count || 0;
        const percentUsed = Math.round((callCount / callLimit) * 100);

        if (callCount >= callLimit) {
          // Exceeded
          if (await shouldNotify(merchant.id, 'usage_exceeded')) {
            try {
              const { subject, html } = usageExceededEmail({
                businessName: merchant.business_name,
                callsUsed: callCount,
                callsLimit: callLimit,
                billingUrl: `${APP_URL}/dashboard/billing`,
              });
              await sendEmail({ to: merchant.email, subject, html });
              await logNotification(merchant.id, 'usage_exceeded');
              results.usageExceeded++;
            } catch (e) {
              console.error(`[Cron] Failed to send usage exceeded email to ${merchant.email}:`, e);
              results.errors++;
            }
          }
        } else if (percentUsed >= 80) {
          // Warning at 80%
          if (await shouldNotify(merchant.id, 'usage_warning_80')) {
            try {
              const { subject, html } = usageWarningEmail({
                businessName: merchant.business_name,
                callsUsed: callCount,
                callsLimit: callLimit,
                percentUsed,
                usageUrl: `${APP_URL}/dashboard/usage`,
              });
              await sendEmail({ to: merchant.email, subject, html });
              await logNotification(merchant.id, 'usage_warning_80');
              results.usageWarning++;
            } catch (e) {
              console.error(`[Cron] Failed to send usage warning email to ${merchant.email}:`, e);
              results.errors++;
            }
          }
        }
      }
    }

    console.log('[Cron] Notification results:', results);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[Cron] Notification error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}

/**
 * Check if we should send this notification (deduplication).
 * Returns true if not already sent for this billing period.
 */
async function shouldNotify(merchantId: string, notificationType: string): Promise<boolean> {
  const billingPeriod = new Date().toISOString().slice(0, 7); // e.g. '2026-01'

  const { data } = await supabase
    .from('notification_log')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('notification_type', notificationType)
    .eq('billing_period', billingPeriod)
    .single();

  return !data;
}

async function logNotification(merchantId: string, notificationType: string): Promise<void> {
  const billingPeriod = new Date().toISOString().slice(0, 7);

  await supabase
    .from('notification_log')
    .upsert(
      {
        merchant_id: merchantId,
        notification_type: notificationType,
        billing_period: billingPeriod,
      },
      { onConflict: 'merchant_id,notification_type,billing_period' }
    );
}
