'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@receptionalx/ui';
import { useOnboardingStore } from '@/lib/onboarding-store';

// Grok Realtime API voices - https://docs.x.ai/docs/guides/voice
const VOICE_OPTIONS = [
  { id: 'Ara', name: 'Ara', description: 'Warm & friendly (Female)', recommended: true },
  { id: 'Rex', name: 'Rex', description: 'Professional & articulate (Male)' },
  { id: 'Sal', name: 'Sal', description: 'Smooth & versatile (Neutral)' },
  { id: 'Eve', name: 'Eve', description: 'Energetic & engaging (Female)' },
  { id: 'Leo', name: 'Leo', description: 'Authoritative & commanding (Male)' },
];

const GREETING_TEMPLATES = [
  {
    id: 'professional',
    name: 'Professional',
    template: "Hello, thank you for calling {businessName}. How may I assist you today?",
  },
  {
    id: 'friendly',
    name: 'Friendly',
    template: "Hi there! Welcome to {businessName}. How can I help you?",
  },
  {
    id: 'formal',
    name: 'Formal',
    template: "Good day, you've reached {businessName}. How may I direct your call?",
  },
  {
    id: 'custom',
    name: 'Custom',
    template: '',
  },
];

export default function AIGreetingPage() {
  const router = useRouter();
  const {
    businessName,
    greeting,
    voiceId,
    setGreeting,
    setVoiceId,
    markStepCompleted,
    setCurrentStep,
  } = useOnboardingStore();

  const [selectedTemplate, setSelectedTemplate] = useState(
    GREETING_TEMPLATES.find((t) => t.template === greeting)?.id || 'custom'
  );
  const [localGreeting, setLocalGreeting] = useState(
    greeting.replace('{businessName}', businessName || 'your business')
  );
  const [localVoiceId, setLocalVoiceId] = useState(voiceId);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = GREETING_TEMPLATES.find((t) => t.id === templateId);
    if (template && template.template) {
      setLocalGreeting(template.template.replace('{businessName}', businessName || 'your business'));
    }
  };

  const handleContinue = () => {
    // Store the greeting with placeholder for business name
    const greetingWithPlaceholder = localGreeting.replace(
      businessName || 'your business',
      '{businessName}'
    );
    setGreeting(greetingWithPlaceholder);
    setVoiceId(localVoiceId);

    markStepCompleted(3);
    setCurrentStep(4);
    router.push('/onboarding/calendar-connect');
  };

  const handleBack = () => {
    router.push('/onboarding/review-info');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customize your AI greeting</h1>
        <p className="mt-1 text-gray-600">
          Choose how your AI receptionist will greet callers.
        </p>
      </div>

      {/* Greeting Templates */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Greeting Style</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {GREETING_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedTemplate === template.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-medium text-gray-900">{template.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Custom Greeting */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Greeting</h2>
        <textarea
          value={localGreeting}
          onChange={(e) => {
            setLocalGreeting(e.target.value);
            setSelectedTemplate('custom');
          }}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Enter your custom greeting..."
        />
        <p className="text-sm text-gray-500 mt-3">
          Tip: Use a friendly, welcoming tone that matches your brand.
        </p>
      </Card>

      {/* Voice Selection */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Voice Selection</h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose a voice for your AI receptionist. Powered by Grok. You will be able to hear the voices when testing.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {VOICE_OPTIONS.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setLocalVoiceId(voice.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                localVoiceId === voice.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    localVoiceId === voice.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{voice.name}</span>
                    {'recommended' in voice && voice.recommended && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{voice.description}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={handleBack}>
          Back
        </Button>
        <Button onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  );
}
