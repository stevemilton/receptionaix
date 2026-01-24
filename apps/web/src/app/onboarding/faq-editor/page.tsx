'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@receptionalx/ui';
import { useOnboardingStore, OnboardingFAQ } from '@/lib/onboarding-store';

const SUGGESTED_QUESTIONS = [
  'What are your opening hours?',
  'Do you accept walk-ins?',
  'What payment methods do you accept?',
  'Do I need to book in advance?',
  'What is your cancellation policy?',
  'Do you offer gift vouchers?',
  'Is parking available?',
  'Are you wheelchair accessible?',
];

export default function FAQEditorPage() {
  const router = useRouter();
  const { faqs, businessName, setFaqs, markStepCompleted, markStepSkipped, setCurrentStep } = useOnboardingStore();

  const [localFaqs, setLocalFaqs] = useState<OnboardingFAQ[]>(
    faqs.length > 0 ? faqs : [{ question: '', answer: '' }]
  );

  const handleAddFAQ = () => {
    setLocalFaqs([...localFaqs, { question: '', answer: '' }]);
  };

  const handleRemoveFAQ = (index: number) => {
    setLocalFaqs(localFaqs.filter((_, i) => i !== index));
  };

  const handleFAQChange = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...localFaqs];
    updated[index] = { ...updated[index], [field]: value };
    setLocalFaqs(updated);
  };

  const handleAddSuggested = (question: string) => {
    // Check if question already exists
    const exists = localFaqs.some(
      (faq) => faq.question.toLowerCase() === question.toLowerCase()
    );
    if (exists) return;

    // Find empty slot or add new
    const emptyIndex = localFaqs.findIndex((faq) => !faq.question.trim());
    if (emptyIndex >= 0) {
      const updated = [...localFaqs];
      updated[emptyIndex] = { question, answer: '' };
      setLocalFaqs(updated);
    } else {
      setLocalFaqs([...localFaqs, { question, answer: '' }]);
    }
  };

  const handleContinue = () => {
    // Filter out empty FAQs
    const validFaqs = localFaqs.filter(
      (faq) => faq.question.trim() && faq.answer.trim()
    );
    setFaqs(validFaqs);

    markStepCompleted(5);
    setCurrentStep(6);
    router.push('/onboarding/phone-setup');
  };

  const handleSkip = () => {
    markStepSkipped(5);
    setCurrentStep(6);
    router.push('/onboarding/phone-setup');
  };

  const handleBack = () => {
    router.push('/onboarding/calendar-connect');
  };

  const unusedSuggestions = SUGGESTED_QUESTIONS.filter(
    (q) => !localFaqs.some((faq) => faq.question.toLowerCase() === q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add frequently asked questions</h1>
        <p className="mt-1 text-gray-600">
          Help your AI receptionist answer common questions about {businessName || 'your business'}.
        </p>
      </div>

      {/* Suggested Questions */}
      {unusedSuggestions.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Suggested Questions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Click to add these common questions:
          </p>
          <div className="flex flex-wrap gap-2">
            {unusedSuggestions.map((question) => (
              <button
                key={question}
                onClick={() => handleAddSuggested(question)}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              >
                + {question}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* FAQ Editor */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your FAQs</h2>
          <Button variant="outline" size="sm" onClick={handleAddFAQ}>
            + Add FAQ
          </Button>
        </div>

        <div className="space-y-4">
          {localFaqs.map((faq, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">FAQ {index + 1}</span>
                {localFaqs.length > 1 && (
                  <button
                    onClick={() => handleRemoveFAQ(index)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              <Input
                placeholder="Question (e.g., Do you accept walk-ins?)"
                value={faq.question}
                onChange={(e) => handleFAQChange(index, 'question', e.target.value)}
              />
              <textarea
                placeholder="Answer (e.g., Yes, we welcome walk-ins but recommend booking in advance to avoid waiting.)"
                value={faq.answer}
                onChange={(e) => handleFAQChange(index, 'answer', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
          ))}
        </div>

        {localFaqs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No FAQs added yet. Click &quot;Add FAQ&quot; or select a suggested question above.</p>
          </div>
        )}
      </Card>

      {/* Tips */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Tips for good FAQs</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Keep answers concise - they&apos;ll be read aloud by your AI</span>
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Include specific details like prices, times, or locations</span>
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Think about what callers commonly ask your business</span>
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>You can always add more FAQs later from your dashboard</span>
          </li>
        </ul>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={handleBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Skip for now
          </button>
          <Button onClick={handleContinue}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
