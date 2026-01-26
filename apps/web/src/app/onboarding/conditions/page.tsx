'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/lib/onboarding-store';

export default function ConditionsPage() {
  const router = useRouter();
  const {
    termsAccepted,
    privacyAccepted,
    dataSharingConsent,
    marketingConsent,
    setTermsAccepted,
    setPrivacyAccepted,
    setDataSharingConsent,
    setMarketingConsent,
    markStepCompleted,
    setCurrentStep,
  } = useOnboardingStore();

  const [localTerms, setLocalTerms] = useState(termsAccepted);
  const [localPrivacy, setLocalPrivacy] = useState(privacyAccepted);
  const [localDataSharing, setLocalDataSharing] = useState(dataSharingConsent);
  const [localMarketing, setLocalMarketing] = useState(marketingConsent);

  const canContinue = localTerms && localPrivacy;

  const handleContinue = () => {
    setTermsAccepted(localTerms);
    setPrivacyAccepted(localPrivacy);
    setDataSharingConsent(localDataSharing);
    setMarketingConsent(localMarketing);
    markStepCompleted(7);
    setCurrentStep(8);
    router.push('/onboarding/complete');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Terms & Conditions</h1>
        <p className="text-gray-600 mt-2">
          Please review and accept our terms to continue
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Terms of Service */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Terms of Service</h2>
          <div className="h-40 overflow-y-auto bg-gray-50 rounded p-3 text-sm text-gray-600 mb-4">
            <p className="mb-2">
              By using ReceptionAI, you agree to the following terms:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are authorized to use the phone number(s) associated with your account</li>
              <li>You will not use the service for any unlawful purpose</li>
              <li>You understand that AI-generated responses may occasionally be inaccurate</li>
              <li>You are responsible for reviewing and managing bookings made through the service</li>
              <li>You agree to pay all applicable fees based on your subscription plan</li>
              <li>We reserve the right to suspend accounts that violate these terms</li>
              <li>The service is provided "as is" without warranties of any kind</li>
            </ul>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localTerms}
              onChange={(e) => setLocalTerms(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700">
              I have read and agree to the Terms of Service
            </span>
          </label>
        </div>

        {/* Privacy Policy */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Privacy Policy</h2>
          <div className="h-40 overflow-y-auto bg-gray-50 rounded p-3 text-sm text-gray-600 mb-4">
            <p className="mb-2">
              Your privacy is important to us. Here's how we handle your data:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We collect business information to personalize your AI receptionist</li>
              <li>Call recordings and transcripts are stored securely and encrypted</li>
              <li>We do not sell your data to third parties</li>
              <li>You can request deletion of your data at any time</li>
              <li>We use industry-standard security measures to protect your information</li>
              <li>Analytics data is used to improve our service</li>
              <li>We comply with GDPR and UK data protection regulations</li>
            </ul>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localPrivacy}
              onChange={(e) => setLocalPrivacy(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700">
              I have read and agree to the Privacy Policy
            </span>
          </label>
        </div>

        {/* Data Sharing Preferences (Optional) */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h2 className="font-semibold text-gray-900 mb-2">Data Sharing Preferences</h2>
          <p className="text-sm text-gray-500 mb-4">
            These are optional. You can change these at any time from your dashboard settings.
          </p>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localDataSharing}
                onChange={(e) => setLocalDataSharing(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
              />
              <div>
                <span className="text-gray-700 font-medium">
                  Help improve ReceptionAI for businesses like yours
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  Allow us to use anonymised, aggregated data from your knowledge base
                  (such as service types and common questions) to improve suggestions
                  for other businesses in your industry. Your business name and
                  customer data are never shared.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localMarketing}
                onChange={(e) => setLocalMarketing(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
              />
              <div>
                <span className="text-gray-700 font-medium">
                  Receive product updates and tips
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  We&apos;ll occasionally send you emails about new features, best practices,
                  and tips for getting the most from your AI receptionist.
                  You can unsubscribe at any time.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            canContinue
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Accept & Continue
        </button>
      </div>
    </div>
  );
}
