'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CLIENT_PRICING_TIERS, type ClientPricingTier } from '@/lib/stripe/pricing';

interface SubscriptionInfo {
  status: string;
  tier: string | null;
  ends_at: string | null;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const searchParams = useSearchParams();

  const supabase = createClient();

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('merchants')
      .select('subscription_status, subscription_tier, subscription_ends_at')
      .eq('id', user.id)
      .single();

    if (data) {
      setSubscription({
        status: data.subscription_status,
        tier: data.subscription_tier,
        ends_at: data.subscription_ends_at,
      });
    }
    setLoading(false);
  }

  async function handleSelectPlan(tierId: string) {
    setCheckoutLoading(tierId);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleManageSubscription() {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = searchParams.get('success') === 'true';
  const isCanceled = searchParams.get('canceled') === 'true';
  const isExpired = searchParams.get('expired') === 'true';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-600">Manage your subscription and billing</p>
      </div>

      {/* Success/Cancel/Expired Messages */}
      {isSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          Payment successful! Your subscription is now active.
        </div>
      )}
      {isCanceled && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          Checkout was canceled. You can try again when you&apos;re ready.
        </div>
      )}
      {isExpired && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          Your subscription has expired. Select a plan below to continue using ReceptionAI.
          While your subscription is inactive, incoming calls will be forwarded to your personal phone number.
        </div>
      )}

      {/* Current Subscription */}
      {subscription && subscription.status !== 'trial' && subscription.status !== 'cancelled' && subscription.status !== 'expired' && (
        <div className="mb-8 bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Current Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 capitalize">
                {subscription.tier || 'No plan'} Plan
              </p>
              <p className="text-sm text-gray-500">
                Status:{' '}
                <span className={`font-medium ${
                  subscription.status === 'active' ? 'text-green-600' :
                  subscription.status === 'past_due' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {subscription.status}
                </span>
              </p>
              {subscription.ends_at && (
                <p className="text-sm text-gray-500">
                  Renews: {new Date(subscription.ends_at).toLocaleDateString('en-GB')}
                </p>
              )}
            </div>
            <button
              onClick={handleManageSubscription}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Manage Subscription
            </button>
          </div>
        </div>
      )}

      {/* Trial Banner */}
      {subscription?.status === 'trial' && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">You&apos;re on a free trial</h3>
              <p className="text-blue-700 mt-1">
                Select a plan below to continue using ReceptionAI after your trial ends.
              </p>
            </div>
            {subscription.ends_at && (
              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                Ends {new Date(subscription.ends_at).toLocaleDateString('en-GB')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CLIENT_PRICING_TIERS.map((tier) => {
          const isCurrentPlan = subscription?.tier === tier.id && subscription?.status === 'active';
          const isEnterprise = tier.id === 'enterprise';

          return (
            <div
              key={tier.id}
              className={`relative bg-white rounded-xl shadow-sm border-2 p-6 flex flex-col ${
                tier.popular ? 'border-primary-500' : 'border-gray-200'
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
              </div>

              <div className="mb-6">
                {isEnterprise ? (
                  <>
                    <span className="text-4xl font-bold text-gray-900">£{tier.price}</span>
                    <span className="text-gray-500">+/month</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-gray-900">£{tier.price}</span>
                    <span className="text-gray-500">/month</span>
                  </>
                )}
              </div>

              {tier.overageRate && (
                <p className="text-xs text-gray-400 -mt-4 mb-6">
                  + £{tier.overageRate.toFixed(2)}/call over limit
                </p>
              )}

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckIcon className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {isEnterprise ? (
                <a
                  href="mailto:enterprise@receptionai.com?subject=Enterprise%20Plan%20Enquiry"
                  className="w-full py-3 rounded-lg font-medium text-center transition-colors bg-gray-900 text-white hover:bg-gray-800 block"
                >
                  Contact Us
                </a>
              ) : (
                <button
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={isCurrentPlan || checkoutLoading !== null}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : tier.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-50`}
                >
                  {checkoutLoading === tier.id
                    ? 'Processing...'
                    : isCurrentPlan
                    ? 'Current Plan'
                    : 'Get Started'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <FAQ
            question="Can I change my plan later?"
            answer="Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated and applied immediately."
          />
          <FAQ
            question="What happens when I exceed my call limit?"
            answer="When you reach your call limit, incoming calls are forwarded to your personal phone number. Additional AI-handled calls beyond your limit are charged at £0.50 per call."
          />
          <FAQ
            question="What happens if my subscription expires?"
            answer="All incoming calls will be forwarded to your personal phone number until you renew your subscription. No calls are lost."
          />
          <FAQ
            question="Is there a contract or commitment?"
            answer="No, all plans are month-to-month. You can cancel at any time and your service will continue until the end of your billing period."
          />
          <FAQ
            question="Do you offer refunds?"
            answer="We offer a 14-day free trial so you can try before you buy. If you're not satisfied within the first 30 days of a paid subscription, contact us for a full refund."
          />
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-medium text-gray-900">{question}</h3>
      <p className="text-sm text-gray-600 mt-1">{answer}</p>
    </div>
  );
}
