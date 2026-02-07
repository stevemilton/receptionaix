'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@receptionalx/ui';
import { useOnboardingStore, OnboardingFAQ } from '@/lib/onboarding-store';

interface MasterFaqSuggestion {
  questionPattern: string;
  suggestedAnswer: string | null;
}

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
  const { faqs, businessName, businessType, setFaqs, markStepCompleted, markStepSkipped, setCurrentStep } = useOnboardingStore();

  const [localFaqs, setLocalFaqs] = useState<OnboardingFAQ[]>(
    faqs.length > 0 ? faqs : [{ question: '', answer: '' }]
  );
  const [suggestingAI, setSuggestingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch master KB FAQ suggestions for the business type
  const [masterFaqSuggestions, setMasterFaqSuggestions] = useState<MasterFaqSuggestion[]>([]);

  useEffect(() => {
    if (businessType) {
      fetch(`/api/master-kb/suggestions?businessType=${encodeURIComponent(businessType)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.suggestions?.faqs) {
            setMasterFaqSuggestions(data.suggestions.faqs);
          }
        })
        .catch(() => {
          // Silently fail — suggestions are enhancement only
        });
    }
  }, [businessType]);

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

    // Check if there's a suggested answer from master KB
    const masterSuggestion = masterFaqSuggestions.find(
      (f) => f.questionPattern === question
    );
    const answer = masterSuggestion?.suggestedAnswer || '';

    // Find empty slot or add new
    const emptyIndex = localFaqs.findIndex((faq) => !faq.question.trim());
    if (emptyIndex >= 0) {
      const updated = [...localFaqs];
      updated[emptyIndex] = { question, answer };
      setLocalFaqs(updated);
    } else {
      setLocalFaqs([...localFaqs, { question, answer }]);
    }
  };

  const handleSuggestWithAI = async () => {
    setSuggestingAI(true);
    setAiError(null);

    try {
      const response = await fetch('/api/knowledge/suggest-faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, businessType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate suggestions');
      }

      if (data.faqs && data.faqs.length > 0) {
        // Replace empty FAQs with AI suggestions
        const hasOnlyEmpty = localFaqs.every((f) => !f.question.trim() && !f.answer.trim());
        if (hasOnlyEmpty) {
          setLocalFaqs(data.faqs);
        } else {
          // Append to existing FAQs
          setLocalFaqs([...localFaqs.filter((f) => f.question.trim()), ...data.faqs]);
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate FAQs');
    } finally {
      setSuggestingAI(false);
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

  // Merge master KB suggestions (business-type-specific) with hardcoded fallbacks
  const masterQuestions = masterFaqSuggestions.map((f) => f.questionPattern);
  const allSuggestedQuestions = [
    ...masterQuestions,
    ...SUGGESTED_QUESTIONS.filter(
      (q) => !masterQuestions.some((mq) => mq.toLowerCase() === q.toLowerCase())
    ),
  ];
  const unusedSuggestions = allSuggestedQuestions.filter(
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

      {/* AI FAQ Generation — show when FAQs are empty or only blank entries */}
      {localFaqs.every((f) => !f.question.trim()) && (
        <Card>
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">No FAQs yet</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              Let AI generate common FAQs for your {businessType || 'business'}. You can edit or remove them afterwards.
            </p>
            {aiError && (
              <p className="text-sm text-red-600 mb-3">{aiError}</p>
            )}
            <Button
              onClick={handleSuggestWithAI}
              loading={suggestingAI}
              className="mx-auto"
            >
              {suggestingAI ? 'Generating FAQs...' : 'Generate FAQs with AI'}
            </Button>
          </div>
        </Card>
      )}

      {/* Suggested Questions */}
      {unusedSuggestions.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Suggested Questions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Click to add these common questions:
          </p>
          <div className="flex flex-wrap gap-2">
            {unusedSuggestions.map((question) => {
              const isMasterKB = masterQuestions.some(
                (mq) => mq.toLowerCase() === question.toLowerCase()
              );
              return (
                <button
                  key={question}
                  onClick={() => handleAddSuggested(question)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    isMasterKB
                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  + {question}
                </button>
              );
            })}
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
