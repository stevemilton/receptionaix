import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, getStripe, getTierByPriceId } from '@/lib/stripe/config';
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

// Lazy-init to avoid build-time crash when env vars are absent
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: any = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createAdminClient();
  }
  return _supabase;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const tierId = session.metadata?.tier_id;

  if (!userId) {
    console.error('No user_id in checkout session metadata');
    return;
  }

  // Verify the merchant exists before updating
  const { data: existingMerchant } = await getSupabase()
    .from('merchants')
    .select('id')
    .eq('id', userId)
    .single();

  if (!existingMerchant) {
    console.error(`[Stripe] No merchant found for user_id in metadata: ${userId}`);
    return;
  }

  console.log(`[Stripe] Checkout completed for user ${userId}, tier ${tierId}`);

  // Look up subscription to find overage item ID
  let overageItemId: string | null = null;
  const subscriptionId = session.subscription as string;
  if (subscriptionId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      const overagePriceId = process.env.STRIPE_PRICE_OVERAGE;
      if (overagePriceId) {
        const overageItem = sub.items.data.find(
          (item) => item.price.id === overagePriceId
        );
        if (overageItem) {
          overageItemId = overageItem.id;
        }
      }
    } catch (err) {
      console.error('[Stripe] Failed to retrieve subscription for overage item:', err);
    }
  }

  // Update merchant with subscription info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    subscription_status: 'active',
    subscription_tier: tierId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscriptionId,
    updated_at: new Date().toISOString(),
  };
  if (overageItemId) {
    updateData.stripe_overage_item_id = overageItemId;
  }

  await getSupabase()
    .from('merchants')
    .update(updateData)
    .eq('id', userId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find merchant by Stripe customer ID
  const { data: merchant } = await getSupabase()
    .from('merchants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!merchant) {
    console.error('No merchant found for customer:', customerId);
    return;
  }

  // Get the price ID from the subscription
  const priceId = subscription.items.data[0]?.price.id;
  const tier = getTierByPriceId(priceId);

  // Determine status
  let status = 'active';
  if (subscription.status === 'trialing') {
    status = 'trial';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'cancelled';
  }

  console.log(`[Stripe] Subscription updated for merchant ${merchant.id}: ${status}`);

  // Get period start/end - handle different Stripe API versions
  const subAny = subscription as Stripe.Subscription & { current_period_start?: number; current_period_end?: number };
  const periodStart = subAny.current_period_start;
  const periodEnd = subAny.current_period_end;

  await getSupabase()
    .from('merchants')
    .update({
      subscription_status: status,
      subscription_tier: tier?.id || null,
      subscription_ends_at: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      billing_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', merchant.id);
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: merchant } = await getSupabase()
    .from('merchants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!merchant) {
    console.error('No merchant found for customer:', customerId);
    return;
  }

  console.log(`[Stripe] Subscription cancelled for merchant ${merchant.id}`);

  await getSupabase()
    .from('merchants')
    .update({
      subscription_status: 'cancelled',
      subscription_ends_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', merchant.id);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Handle different Stripe API versions
  const invoiceAny = invoice as Stripe.Invoice & { subscription?: string | null };
  if (!invoiceAny.subscription) return;

  const customerId = invoice.customer as string;

  const { data: merchant } = await getSupabase()
    .from('merchants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!merchant) return;

  console.log(`[Stripe] Invoice paid for merchant ${merchant.id}`);

  // Ensure status is active after successful payment
  await getSupabase()
    .from('merchants')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', merchant.id);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  // Handle different Stripe API versions
  const invoiceAny = invoice as Stripe.Invoice & { subscription?: string | null };
  if (!invoiceAny.subscription) return;

  const customerId = invoice.customer as string;

  const { data: merchant } = await getSupabase()
    .from('merchants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!merchant) return;

  console.log(`[Stripe] Invoice failed for merchant ${merchant.id}`);

  await getSupabase()
    .from('merchants')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', merchant.id);
}
