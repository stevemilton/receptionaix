import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';
import { validateCsrfOrigin, csrfForbiddenResponse } from '@/lib/csrf';

export async function POST(request: Request) {
  if (!validateCsrfOrigin(request)) {
    return csrfForbiddenResponse();
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get merchant's Stripe customer ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: merchant } = await (supabase as any)
      .from('merchants')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!merchant?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    // Create Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: merchant.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
