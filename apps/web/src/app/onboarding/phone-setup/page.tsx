'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@receptionalx/ui';
import { useOnboardingStore } from '@/lib/onboarding-store';

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
}

export default function PhoneSetupPage() {
  const router = useRouter();
  const {
    twilioPhoneNumber,
    forwardPhone,
    phone,
    setTwilioPhone,
    setForwardPhone,
    markStepCompleted,
    setCurrentStep,
  } = useOnboardingStore();

  const [loading, setLoading] = useState(false);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(twilioPhoneNumber);
  const [error, setError] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState(!!twilioPhoneNumber);

  const handleSearchNumbers = async () => {
    setSearchingNumbers(true);
    setError(null);

    try {
      const response = await fetch('/api/twilio/available-numbers');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search for numbers');
      }

      setAvailableNumbers(data.numbers || []);
      if (data.numbers?.length === 0) {
        setError('No numbers available. Please try again later.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search for numbers');
    } finally {
      setSearchingNumbers(false);
    }
  };

  const handleProvisionNumber = async () => {
    if (!selectedNumber) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/twilio/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: selectedNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to provision number');
      }

      setTwilioPhone(data.phoneNumber);
      setProvisioned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to provision number');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    markStepCompleted(6);
    setCurrentStep(7);
    router.push('/onboarding/conditions');
  };

  const handleBack = () => {
    router.push('/onboarding/faq-editor');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Set up your phone number</h1>
        <p className="mt-1 text-gray-600">
          Get a dedicated phone number for your AI receptionist.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {provisioned ? (
        <>
          <Card>
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Phone Number Ready!</h2>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {twilioPhoneNumber}
              </p>
              <p className="text-gray-600 mt-2">
                Your AI receptionist is ready to answer calls on this number.
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your personal phone number</h2>
            <p className="text-sm text-gray-600 mb-4">
              If your AI receptionist can&apos;t take a call (e.g. your call limit is reached or your subscription expires), calls will be forwarded to this number instead.
            </p>
            <input
              type="tel"
              value={forwardPhone || phone || ''}
              onChange={(e) => setForwardPhone(e.target.value)}
              placeholder="+44 7700 900123"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-2">
              This should be a number you can answer personally. We&apos;ll never share it with callers.
            </p>
          </Card>
        </>
      ) : (
        <>
          {/* Search for numbers */}
          {availableNumbers.length === 0 ? (
            <Card>
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Get Your AI Receptionist Number
                </h2>
                <p className="text-gray-600 mt-1 mb-6">
                  We&apos;ll provision a UK phone number for your business.
                </p>
                <Button onClick={handleSearchNumbers} loading={searchingNumbers}>
                  Search Available Numbers
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Select Your Number
              </h2>
              <div className="space-y-2">
                {availableNumbers.map((number) => (
                  <button
                    key={number.phoneNumber}
                    onClick={() => setSelectedNumber(number.phoneNumber)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedNumber === number.phoneNumber
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-semibold text-gray-900">
                          {number.friendlyName}
                        </span>
                        {number.locality && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({number.locality})
                          </span>
                        )}
                      </div>
                      {selectedNumber === number.phoneNumber && (
                        <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-between items-center">
                <button
                  onClick={handleSearchNumbers}
                  className="text-sm text-gray-600 hover:text-gray-900"
                  disabled={searchingNumbers}
                >
                  {searchingNumbers ? 'Searching...' : 'Search again'}
                </button>
                <Button
                  onClick={handleProvisionNumber}
                  disabled={!selectedNumber}
                  loading={loading}
                >
                  Provision This Number
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Info about the number */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          How it works
        </h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0 text-primary-600 font-semibold">
              1
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Forward your calls</h3>
              <p className="text-sm text-gray-600">
                Set up call forwarding from your existing business number to your AI number.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0 text-primary-600 font-semibold">
              2
            </div>
            <div>
              <h3 className="font-medium text-gray-900">AI answers calls</h3>
              <p className="text-sm text-gray-600">
                Your AI receptionist will answer, help callers, and book appointments.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0 text-primary-600 font-semibold">
              3
            </div>
            <div>
              <h3 className="font-medium text-gray-900">You stay informed</h3>
              <p className="text-sm text-gray-600">
                Get notifications and transcripts of every call in your dashboard.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={handleBack}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!provisioned}>
          Continue
        </Button>
      </div>
    </div>
  );
}
