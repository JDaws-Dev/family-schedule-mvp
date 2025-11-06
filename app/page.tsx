import Link from "next/link";
import FAQ from "@/components/FAQ";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header with navigation */}
      <header className="bg-white/80 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-slate-900 hover:text-primary-600 transition">
              Our Daily Family
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">How it works</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">FAQ</a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="px-5 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-sm"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section - Clean and Professional */}
        <div className="py-12 lg:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-200 rounded-full text-sm font-medium text-primary-700 mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Trusted by busy families nationwide
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 leading-[1.1] tracking-tight">
              Your family's schedule,<br/>
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">finally organized</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Stop missing activities buried in emails. Our Daily Family automatically finds every practice,
              game, and lesson—organizing them into one simple calendar your whole family can access.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-medium hover:shadow-strong transform hover:-translate-y-0.5"
              >
                Start your 7-day trial
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
              <button className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-slate-700 bg-white rounded-lg border-2 border-slate-300 hover:border-slate-400 transition-all">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Watch demo
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-6">Then $9.99/month • Cancel anytime</p>
          </div>
        </div>

        {/* Mobile App Announcement Banner */}
        <div className="mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600 p-1">
              <div className="relative bg-white rounded-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold mb-2">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                      </svg>
                      COMING 2026
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                      Native Mobile Apps Coming Soon
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Get ready for iOS and Android apps with offline access, push notifications, and widget support. Be the first to know when they launch!
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-secondary-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap">
                      Join Waitlist
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Indicators - Minimal and Clean */}
        <div className="border-y border-gray-200 py-8 mb-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">Bank-level security</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">Instant sync across devices</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="mb-32 scroll-mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 p-12 md:p-16 text-white">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Set up in minutes
              </h2>
              <p className="text-xl text-white/90">
                Three simple steps to organized family life
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold text-lg mb-6 shadow-lg">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-3">Connect email</h3>
                <p className="text-white/90 leading-relaxed">
                  Securely link your Gmail account in one click. We only read activity-related emails—nothing else.
                </p>
              </div>
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold text-lg mb-6 shadow-lg">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-3">AI organizes</h3>
                <p className="text-white/90 leading-relaxed">
                  Our AI automatically finds every practice, game, lesson, and event—extracting dates, times, and locations.
                </p>
              </div>
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold text-lg mb-6 shadow-lg">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-3">Stay synced</h3>
                <p className="text-white/90 leading-relaxed">
                  Access your calendar anywhere. Get reminders. Share with your spouse. Never miss another activity.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mb-32 scroll-mt-20">
          <div className="bg-slate-50 rounded-3xl p-12 md:p-16">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Everything you need
              </h2>
              <p className="text-xl text-gray-600">
                Built specifically for busy families
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-medium transition-shadow">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Automatic email scanning</h3>
                <p className="text-gray-600 leading-relaxed">
                  Never manually enter an event again. Our AI reads your emails and extracts every activity detail automatically.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Shared family calendar</h3>
                <p className="text-gray-600 leading-relaxed">
                  One calendar for the whole family. Both parents see the same schedule. No more miscommunication.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Smart reminders</h3>
                <p className="text-gray-600 leading-relaxed">
                  Get email and text reminders before each activity. Choose how far in advance you want to be notified.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Access anywhere</h3>
                <p className="text-gray-600 leading-relaxed">
                  View your schedule on any device. Syncs with Google Calendar so it appears on your iPhone or Android.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div id="pricing" className="mb-32 scroll-mt-20">
          <div className="bg-slate-50 rounded-3xl p-12 md:p-16">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-xl text-slate-600">
                Less than a latte per month
              </p>
            </div>
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-3xl shadow-strong border-2 border-primary-200 overflow-hidden transform hover:scale-105 transition-transform">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6 text-white">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">$9.99</span>
                    <span className="text-xl opacity-90">/month</span>
                  </div>
                  <p className="mt-2 text-white/90">Everything included. Cancel anytime.</p>
                  <p className="mt-3 text-sm text-white/80">
                    Or save 20% with annual: <span className="font-semibold">$95/year</span>
                  </p>
                </div>

                <div className="px-8 py-10">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Automatic email scanning</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Shared family calendar</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Both parents included</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Multiple email accounts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Email & SMS reminders</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Google Calendar sync</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Unlimited events</span>
                  </li>
                </ul>

                <Link
                  href="/sign-up"
                  className="block text-center bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all shadow-medium hover:shadow-strong"
                >
                  Start your 7-day trial
                </Link>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Credit card required • Cancel anytime
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* FAQ Section - Interactive */}
        <div id="faq" className="scroll-mt-20">
          <FAQ />
        </div>

        {/* Final CTA */}
        <div className="my-32">
          <div className="bg-slate-900 rounded-3xl px-8 py-20 text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to simplify your life?
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Join busy families who've stopped stressing about their schedule
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-strong hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Start your 7-day trial
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
            <p className="mt-6 text-sm text-slate-400">
              Then $9.99/month • Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-xl font-bold text-gray-900 mb-4">Our Daily Family</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Automatically organize your family's activities from email into one simple calendar.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#features" className="hover:text-gray-900 transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-900 transition">Pricing</a></li>
                <li><a href="#faq" className="hover:text-gray-900 transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="text-gray-600">support@ourdailyfamily.com</li>
                <li className="text-gray-600">Mon-Fri 9am-5pm ET</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Connect</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/sign-up" className="hover:text-gray-900 transition">Start Free Trial</Link>
                </li>
                <li>
                  <Link href="/sign-in" className="hover:text-gray-900 transition">Sign In</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>&copy; 2024 Our Daily Family. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
