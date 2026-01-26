import Link from 'next/link';
import { CLIENT_PRICING_TIERS } from '@/lib/stripe/pricing';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary-600">
            ReceptionAI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your business. Start with a 14-day free trial, no credit card required.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CLIENT_PRICING_TIERS.map((tier) => {
              const isEnterprise = tier.id === 'enterprise';

              return (
                <div
                  key={tier.id}
                  className={`relative bg-white rounded-2xl shadow-sm border-2 p-8 flex flex-col ${
                    tier.popular ? 'border-primary-500 shadow-lg' : 'border-gray-200'
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-medium px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
                    <p className="text-gray-500 mt-1">{tier.description}</p>
                  </div>

                  <div className="mb-6">
                    {isEnterprise ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">&pound;{tier.price}</span>
                        <span className="text-gray-500">+/month</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-gray-900">&pound;{tier.price}</span>
                        <span className="text-gray-500">/month</span>
                      </>
                    )}
                  </div>

                  {tier.overageRate && (
                    <p className="text-xs text-gray-400 -mt-4 mb-6">
                      + &pound;{tier.overageRate.toFixed(2)}/call over limit
                    </p>
                  )}

                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
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
                    <Link
                      href="/auth/signup"
                      className={`w-full py-3 rounded-lg font-medium text-center transition-colors block ${
                        tier.popular
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      Start Free Trial
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4 text-sm font-medium text-gray-500">Feature</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-900">Starter</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-primary-600">Professional</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-900">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <ComparisonRow label="Monthly calls" values={['80', '400', 'Unlimited']} />
                <ComparisonRow label="Monthly minutes" values={['~200', '~1,000', 'Unlimited']} />
                <ComparisonRow label="AI receptionist" values={[true, true, true]} />
                <ComparisonRow label="Knowledge base" values={[true, true, true]} />
                <ComparisonRow label="Call transcripts" values={[true, true, true]} />
                <ComparisonRow label="Google Calendar" values={[false, true, true]} />
                <ComparisonRow label="Custom greeting" values={[false, true, true]} />
                <ComparisonRow label="HD voice" values={[false, true, true]} />
                <ComparisonRow label="24/7 availability" values={[false, true, true]} />
                <ComparisonRow label="Multi-location" values={[false, false, true]} />
                <ComparisonRow label="API access" values={[false, false, true]} />
                <ComparisonRow label="White-label" values={[false, false, true]} />
                <ComparisonRow label="Support" values={['Email', 'Priority', 'Dedicated']} />
                <ComparisonRow label="Overage rate" values={['&pound;0.50/call', '&pound;0.50/call', 'N/A']} />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <FAQ
              question="Is there a free trial?"
              answer="Yes! All plans include a 14-day free trial. No credit card required to start."
            />
            <FAQ
              question="Can I change my plan later?"
              answer="Yes, you can upgrade or downgrade at any time. Changes are prorated and applied immediately."
            />
            <FAQ
              question="What happens when I exceed my call limit?"
              answer="Incoming calls are forwarded to your personal phone number. Any additional AI-handled calls beyond your limit are charged at &pound;0.50 per call."
            />
            <FAQ
              question="What if my subscription expires?"
              answer="All incoming calls will be forwarded to your personal phone number. No calls are lost, and your settings are saved for when you resubscribe."
            />
            <FAQ
              question="Is there a contract?"
              answer="No, all plans are month-to-month. Cancel anytime and your service continues until the end of your billing period."
            />
            <FAQ
              question="Do you offer refunds?"
              answer="We offer a 14-day free trial. If you're not satisfied within 30 days of a paid subscription, contact us for a full refund."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to never miss a call again?
          </h2>
          <p className="text-primary-100 mb-8 text-lg">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} ReceptionAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function ComparisonRow({ label, values }: { label: string; values: (string | boolean)[] }) {
  return (
    <tr>
      <td className="py-3 pr-4 text-sm text-gray-700">{label}</td>
      {values.map((value, i) => (
        <td key={i} className="text-center py-3 px-4">
          {typeof value === 'boolean' ? (
            value ? (
              <svg className="w-5 h-5 text-green-500 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="text-gray-300">&mdash;</span>
            )
          ) : (
            <span className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: value }} />
          )}
        </td>
      ))}
    </tr>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white rounded-lg border p-5">
      <h3 className="font-medium text-gray-900">{question}</h3>
      <p className="text-sm text-gray-600 mt-2" dangerouslySetInnerHTML={{ __html: answer }} />
    </div>
  );
}
