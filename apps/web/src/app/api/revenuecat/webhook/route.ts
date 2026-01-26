import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map RevenueCat product IDs to our tier IDs
const PRODUCT_TIER_MAP: Record<string, string> = {
  'receptionai_starter_monthly': 'starter',
  'receptionai_professional_monthly': 'professional',
  'receptionai_enterprise_monthly': 'enterprise',
  // Add iOS/Android product IDs here
  'com.receptionai.starter': 'starter',
  'com.receptionai.professional': 'professional',
  'com.receptionai.enterprise': 'enterprise',
};

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  expiration_at_ms?: number;
  event_timestamp_ms: number;
}

interface RevenueCatWebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload: RevenueCatWebhookPayload = await request.json();
    const { event } = payload;

    console.log(`[RevenueCat] Event: ${event.type} for user ${event.app_user_id}`);

    const merchantId = event.app_user_id;
    const tierId = event.product_id ? PRODUCT_TIER_MAP[event.product_id] || null : null;

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL': {
        await supabase
          .from('merchants')
          .update({
            subscription_status: 'active',
            subscription_tier: tierId,
            subscription_ends_at: event.expiration_at_ms
              ? new Date(event.expiration_at_ms).toISOString()
              : null,
            billing_period_start: new Date(event.event_timestamp_ms).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', merchantId);

        console.log(`[RevenueCat] Activated subscription for ${merchantId}: ${tierId}`);
        break;
      }

      case 'CANCELLATION': {
        // Subscription cancelled but may still be active until period end
        await supabase
          .from('merchants')
          .update({
            subscription_status: event.expiration_at_ms && event.expiration_at_ms > Date.now()
              ? 'active' // Still in paid period
              : 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', merchantId);

        console.log(`[RevenueCat] Cancellation for ${merchantId}`);
        break;
      }

      case 'EXPIRATION': {
        await supabase
          .from('merchants')
          .update({
            subscription_status: 'expired',
            subscription_ends_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', merchantId);

        console.log(`[RevenueCat] Expired subscription for ${merchantId}`);
        break;
      }

      case 'BILLING_ISSUE': {
        await supabase
          .from('merchants')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', merchantId);

        console.log(`[RevenueCat] Billing issue for ${merchantId}`);
        break;
      }

      case 'PRODUCT_CHANGE': {
        // User changed their subscription product
        await supabase
          .from('merchants')
          .update({
            subscription_tier: tierId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', merchantId);

        console.log(`[RevenueCat] Product change for ${merchantId}: ${tierId}`);
        break;
      }

      default:
        console.log(`[RevenueCat] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[RevenueCat] Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
