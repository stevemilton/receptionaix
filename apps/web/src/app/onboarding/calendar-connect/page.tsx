'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card } from '@receptionalx/ui';
import { useOnboardingStore } from '@/lib/onboarding-store';

function CalendarConnectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    googleCalendarConnected,
    setGoogleCalendar,
    markStepCompleted,
    markStepSkipped,
    setCurrentStep,
  } = useOnboardingStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const success = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (success === 'true') {
      // Calendar was connected successfully
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const expiresAt = searchParams.get('expires_at');

      if (accessToken && refreshToken && expiresAt) {
        setGoogleCalendar({
          accessToken,
          refreshToken,
          expiresAt: parseInt(expiresAt),
        });
      }
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams, setGoogleCalendar]);

  const handleConnectCalendar = () => {
    setLoading(true);
    // Redirect to Google OAuth
    window.location.href = '/api/google/auth';
  };

  const handleDisconnect = () => {
    setGoogleCalendar(null);
  };

  const handleContinue = () => {
    markStepCompleted(4);
    setCurrentStep(5);
    router.push('/onboarding/faq-editor');
  };

  const handleSkip = () => {
    markStepSkipped(4);
    setCurrentStep(5);
    router.push('/onboarding/faq-editor');
  };

  const handleBack = () => {
    router.push('/onboarding/ai-greeting');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connect your calendar</h1>
        <p className="mt-1 text-gray-600">
          Connect Google Calendar to let your AI receptionist book appointments.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <Card>
        {googleCalendarConnected ? (
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
            <h2 className="text-lg font-semibold text-gray-900">Calendar Connected</h2>
            <p className="text-gray-600 mt-1">
              Your Google Calendar is connected. Your AI receptionist can now book appointments.
            </p>
            <button
              onClick={handleDisconnect}
              className="mt-4 text-sm text-red-600 hover:text-red-700 underline"
            >
              Disconnect Calendar
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Connect Google Calendar</h2>
            <p className="text-gray-600 mt-1 mb-6">
              Allow your AI receptionist to check availability and book appointments.
            </p>

            <Button onClick={handleConnectCalendar} loading={loading} className="mx-auto">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                />
              </svg>
              Connect with Google
            </Button>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                What we&apos;ll access:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  View your calendar availability
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Create new calendar events
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  View and modify existing events
                </li>
              </ul>
            </div>
          </div>
        )}
      </Card>

      {/* Benefits */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Why connect your calendar?
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Real-time availability</h3>
              <p className="text-sm text-gray-600">
                AI knows when you&apos;re free to book appointments
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Automatic booking</h3>
              <p className="text-sm text-gray-600">
                New appointments appear in your calendar instantly
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">No double bookings</h3>
              <p className="text-sm text-gray-600">
                Prevents scheduling conflicts automatically
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
        <div className="flex items-center gap-3">
          {!googleCalendarConnected && (
            <button
              onClick={handleSkip}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Skip for now
            </button>
          )}
          <Button onClick={handleContinue}>Continue</Button>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>
      <div className="bg-white rounded-xl p-6 border border-gray-200 h-64"></div>
    </div>
  );
}

export default function CalendarConnectPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CalendarConnectContent />
    </Suspense>
  );
}
