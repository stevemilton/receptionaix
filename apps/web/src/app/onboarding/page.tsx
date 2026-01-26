import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if already onboarded
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, onboarding_completed')
    .eq('id', user.id)
    .single() as { data: { id: string; onboarding_completed: boolean } | null };

  // Only redirect to dashboard if onboarding is actually complete
  if (merchant?.onboarding_completed) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            ReceptionAI
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Let&apos;s set up your AI receptionist
          </h1>
          <p className="mt-2 text-gray-600">
            We&apos;ll guide you through the setup process in a few simple steps.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold">Find your business</h3>
                <p className="text-gray-600 text-sm">
                  Search for your business to automatically import details
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-400">Review your information</h3>
                <p className="text-gray-400 text-sm">
                  Confirm your services, hours, and contact details
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-400">Connect your calendar</h3>
                <p className="text-gray-400 text-sm">
                  Link Google Calendar for appointment booking
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-400">Set up your phone</h3>
                <p className="text-gray-400 text-sm">
                  Get your AI receptionist phone number
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/onboarding/business-search"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
