import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-primary-600">ReceptionAI</div>
        <div className="space-x-4">
          <Link
            href="/pricing"
            className="text-gray-600 hover:text-primary-600 transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/auth/login"
            className="text-gray-600 hover:text-primary-600 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Never Miss a Call Again
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered receptionist for UK small businesses. Book appointments,
            take messages, and delight your customers — 24/7.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/auth/signup"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="#demo"
              className="border border-primary-600 text-primary-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary-50 transition-colors"
            >
              See Demo
            </Link>
          </div>
        </div>

        {/* Pricing Teaser */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-2">Plans from</p>
          <p className="text-3xl font-bold text-gray-900">
            &pound;49<span className="text-lg font-normal text-gray-500">/month</span>
          </p>
          <Link
            href="/pricing"
            className="inline-block mt-3 text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            View all plans &rarr;
          </Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Answer Every Call</h3>
            <p className="text-gray-600">
              Professional voice AI answers calls in seconds, handling enquiries just like a real receptionist.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Book Appointments</h3>
            <p className="text-gray-600">
              Syncs with your calendar to book, reschedule, and cancel appointments automatically.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Take Messages</h3>
            <p className="text-gray-600">
              Captures caller details and messages, delivered instantly to your phone or email.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
