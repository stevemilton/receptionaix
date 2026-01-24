'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { OnboardingGuard } from '@/components/OnboardingGuard';

const STEPS = [
  { path: '/onboarding/business-search', label: 'Find Business', number: 1 },
  { path: '/onboarding/review-info', label: 'Review Info', number: 2 },
  { path: '/onboarding/ai-greeting', label: 'AI Greeting', number: 3 },
  { path: '/onboarding/calendar-connect', label: 'Calendar', number: 4, optional: true },
  { path: '/onboarding/faq-editor', label: 'FAQs', number: 5, optional: true },
  { path: '/onboarding/phone-setup', label: 'Phone Setup', number: 6 },
  { path: '/onboarding/conditions', label: 'Terms', number: 7 },
  { path: '/onboarding/complete', label: 'Complete', number: 8 },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentStepIndex = STEPS.findIndex((step) => step.path === pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-primary-600">
            ReceptionAI
          </Link>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const isClickable = isCompleted;

              return (
                <div key={step.path} className="flex items-center">
                  {/* Step indicator */}
                  <div className="flex flex-col items-center">
                    {isClickable ? (
                      <Link href={step.path} className="group">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                            isCompleted
                              ? 'bg-primary-600 text-white group-hover:bg-primary-700'
                              : isActive
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {isCompleted ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            step.number
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          isActive
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {step.number}
                      </div>
                    )}
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isActive ? 'text-primary-600' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                      {step.optional && (
                        <span className="block text-gray-400">(optional)</span>
                      )}
                    </span>
                  </div>

                  {/* Connector line */}
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        index < currentStepIndex ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                      style={{ minWidth: '20px' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <OnboardingGuard>{children}</OnboardingGuard>
      </main>
    </div>
  );
}
