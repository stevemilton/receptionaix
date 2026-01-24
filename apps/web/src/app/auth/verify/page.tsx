import Link from 'next/link';

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <Link href="/" className="text-2xl font-bold text-primary-600 block">
            ReceptionAI
          </Link>
          <div className="mt-8">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Check your email
          </h2>
          <p className="mt-4 text-gray-600">
            We&apos;ve sent you a verification link. Please check your email and click the link to verify your account.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-sm text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or
          </p>
          <Link
            href="/auth/login"
            className="inline-block text-primary-600 hover:text-primary-500 font-medium"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
