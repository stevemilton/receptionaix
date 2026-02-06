import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, getTierById } from '@/lib/stripe/config';
import { validateCsrfOrigin, csrfForbiddenResponse } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return csrfForbiddenResponse();
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tierId } = await request.json();

    if (!tierId || typeof tierId !== 'string') {
      return NextResponse.json({ error: 'Tier ID is required' }, { status: 400 });
    }

    const tier = getTierById(tierId);
    if (!tier) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get or create Stripe customer
    const { data: merchant } = await supabase
      .from('merchants')
      .select('stripe_customer_id, email, business_name')
      .eq('id', user.id)
      .single();

    let customerId = merchant?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: merchant?.email || user.email,
        name: merchant?.business_name,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('merchants')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Build line items: subscription + optional metered overage
    const lineItems: Array<{ price: string; quantity?: number }> = [
      { price: tier.priceId, quantity: 1 },
    ];

    // Add metered overage price for non-enterprise tiers
    const overagePriceId = process.env.STRIPE_PRICE_OVERAGE;
    if (overagePriceId && tier.overageRate) {
      lineItems.push({ price: overagePriceId });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          tier_id: tierId,
          user_id: user.id,
        },
      },
      metadata: {
        tier_id: tierId,
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
