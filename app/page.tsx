import Link from "next/link";
import FAQ from "@/components/FAQ";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-50 via-white to-primary-50">
      {/* Header with navigation */}
      <header className="bg-warm-50/95 border-b border-primary-100  backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-primary-800 hover:text-primary-600 transition">
              Our Daily Family
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-primary-700 hover:text-primary-900 transition">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-primary-700 hover:text-primary-900 transition">How it works</a>
              <a href="#pricing" className="text-sm font-medium text-primary-700 hover:text-primary-900 transition">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-primary-700 hover:text-primary-900 transition">FAQ</a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-primary-700 hover:text-primary-900 transition"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition shadow-soft"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="py-16 lg:py-24">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-full text-sm font-semibold text-secondary-700 mb-8">
              <span className="text-lg">💕</span>
              Built by a mom who gets it
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-primary-900 mb-8 leading-[1.05]">
              Stop juggling.<br/>
              <span className="text-secondary-500">Start breathing.</span>
            </h1>

            <p className="text-2xl md:text-3xl text-gray-700 mb-6 font-medium">
              The mental load is exhausting you.
            </p>

            <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              We handle your family's schedule so you can actually be present instead of drowning in emails and sticky notes.
            </p>

            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white bg-gradient-to-r from-secondary-400 to-secondary-500 rounded-2xl hover:from-secondary-500 hover:to-secondary-600 transition-all shadow-lifted hover:shadow-strong transform hover:-translate-y-1"
            >
              Yes! Give me peace
              <svg className="w-6 h-6 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </Link>

            <p className="text-sm text-gray-500 mt-6">7 days free • Then $9.99/month • Cancel anytime</p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="border-y border-primary-100 bg-warm-50/50 py-12 mb-24">
          <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-800">100% Secure & Private</span>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-accent-100 to-accent-200 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-800">Setup in 60 Seconds</span>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-800">Cancel Anytime</span>
            </div>
          </div>
        </div>

        {/* Sound Familiar? Section */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-primary-900 mb-6">
              Does this sound familiar?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              You're not a bad mom. You're just drowning in the details.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 p-10 rounded-3xl border-2 border-secondary-200 hover:shadow-card transition-all">
              <div className="text-6xl mb-6">😰</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">"That was TODAY?!"</h3>
              <p className="text-gray-700 text-lg">
                Practice started 30 minutes ago. Cue the guilt spiral and frantic apology texts.
              </p>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-10 rounded-3xl border-2 border-primary-200 hover:shadow-card transition-all">
              <div className="text-6xl mb-6">📧</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">"Where's that email?!"</h3>
              <p className="text-gray-700 text-lg">
                Lost in 200 unread messages. Searching frantically at 6am is NOT the vibe.
              </p>
            </div>

            <div className="bg-gradient-to-br from-accent-50 to-accent-100 p-10 rounded-3xl border-2 border-accent-200 hover:shadow-card transition-all">
              <div className="text-6xl mb-6">🗓️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">"Tuesday or Thursday?!"</h3>
              <p className="text-gray-700 text-lg">
                Sticky notes. Five apps. Three group texts. You just want ONE place.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <p className="text-2xl text-primary-800 font-semibold max-w-2xl mx-auto">
              You deserve something that makes life EASIER.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="mb-32 scroll-mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 p-16 md:p-20 text-white shadow-lifted">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                It's THIS simple
              </h2>
              <p className="text-2xl text-white/95">
                No tutorials. Just relief.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-16 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm text-white rounded-2xl font-bold text-3xl mb-8 shadow-lg mx-auto">
                  1
                </div>
                <h3 className="text-3xl font-bold mb-4">Click</h3>
                <p className="text-white/95 text-lg leading-relaxed">
                  Connect your email. One click. Done.
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm text-white rounded-2xl font-bold text-3xl mb-8 shadow-lg mx-auto">
                  2
                </div>
                <h3 className="text-3xl font-bold mb-4">Relax</h3>
                <p className="text-white/95 text-lg leading-relaxed">
                  We handle everything. You do nothing.
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm text-white rounded-2xl font-bold text-3xl mb-8 shadow-lg mx-auto">
                  3
                </div>
                <h3 className="text-3xl font-bold mb-4">Breathe</h3>
                <p className="text-white/95 text-lg leading-relaxed">
                  Show up on time. Be present.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Big Visual Features */}
        <div id="features" className="mb-32 scroll-mt-20">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-7xl font-bold text-primary-900 mb-8">
              What we do for you
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-8">
            {/* Email Scanning */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-12 rounded-3xl border-2 border-primary-200 hover:shadow-lifted transition-all">
              <div className="text-8xl mb-8">📧</div>
              <h3 className="text-4xl font-bold text-primary-900 mb-4">We read your emails</h3>
              <p className="text-xl text-gray-700">
                Find every practice, game, and lesson. Add to calendar. Done.
              </p>
            </div>

            {/* Photo Snap */}
            <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 p-12 rounded-3xl border-2 border-secondary-200 hover:shadow-lifted transition-all">
              <div className="text-8xl mb-8">📸</div>
              <h3 className="text-4xl font-bold text-secondary-900 mb-4">Snap & go</h3>
              <p className="text-xl text-gray-700">
                Take a photo of any flyer. We handle the rest.
              </p>
            </div>

            {/* Phone Calendar */}
            <div className="bg-gradient-to-br from-accent-50 to-accent-100 p-12 rounded-3xl border-2 border-accent-200 hover:shadow-lifted transition-all">
              <div className="text-8xl mb-8">📱</div>
              <h3 className="text-4xl font-bold text-accent-900 mb-4">Your calendar</h3>
              <p className="text-xl text-gray-700">
                Shows up right in Google Calendar. No new app.
              </p>
            </div>

            {/* Partner Sharing */}
            <div className="bg-gradient-to-br from-secondary-50 to-accent-50 p-12 rounded-3xl border-2 border-secondary-200 hover:shadow-lifted transition-all">
              <div className="text-8xl mb-8">💑</div>
              <h3 className="text-4xl font-bold text-primary-900 mb-4">Partner sees it</h3>
              <p className="text-xl text-gray-700">
                No more "you didn't tell me!" fights. Ever.
              </p>
            </div>
          </div>
        </div>

        {/* Social Proof - Real Families */}
        <div className="mb-32">
          <div className="bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 rounded-3xl p-12 md:p-16">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-bold text-primary-900 mb-6">
                Real moms, life changed
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-10 rounded-3xl shadow-card hover:shadow-lifted transition-shadow">
                <div className="text-6xl mb-6">💚</div>
                <p className="text-gray-800 text-2xl font-medium mb-4">
                  "I sleep now. SLEEP!"
                </p>
                <p className="text-gray-600 text-lg mb-4">
                  No more 2am panic about what's happening when.
                </p>
                <p className="text-sm text-gray-500">— Lisa K., Single mom of 2</p>
              </div>

              <div className="bg-white p-10 rounded-3xl shadow-card hover:shadow-lifted transition-shadow">
                <div className="text-6xl mb-6">💝</div>
                <p className="text-gray-800 text-2xl font-medium mb-4">
                  "Marriage saver, honestly."
                </p>
                <p className="text-gray-600 text-lg mb-4">
                  No more "you never told me!" fights.
                </p>
                <p className="text-sm text-gray-500">— Jessica T., Mom of 2</p>
              </div>

              <div className="bg-white p-10 rounded-3xl shadow-card hover:shadow-lifted transition-shadow">
                <div className="text-6xl mb-6">✨</div>
                <p className="text-gray-800 text-2xl font-medium mb-4">
                  "My kids asked if I took a class!"
                </p>
                <p className="text-gray-600 text-lg mb-4">
                  Suddenly I'm the organized mom.
                </p>
                <p className="text-sm text-gray-500">— Sarah M., Mom of 3</p>
              </div>

              <div className="bg-white p-10 rounded-3xl shadow-card hover:shadow-lifted transition-shadow">
                <div className="text-6xl mb-6">🙌</div>
                <p className="text-gray-800 text-2xl font-medium mb-4">
                  "So easy my MIL could use it."
                </p>
                <p className="text-gray-600 text-lg mb-4">
                  One click. It just works.
                </p>
                <p className="text-sm text-gray-500">— Maria G., Mom of 4</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div id="pricing" className="mb-32 scroll-mt-20">
          <div className="bg-warm-50 rounded-3xl p-12 md:p-16">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-7xl font-bold text-primary-900 mb-6">
                Less than two coffees
              </h2>
              <p className="text-2xl text-gray-600">
                But actually life-changing
              </p>
            </div>
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-3xl shadow-lifted border-3 border-secondary-200 overflow-hidden transform hover:scale-105 transition-transform">
                <div className="bg-gradient-to-br from-secondary-400 to-secondary-500 px-10 py-10 text-white text-center">
                  <div className="text-7xl font-bold mb-3">$9.99</div>
                  <p className="text-2xl font-medium">per month</p>
                  <p className="mt-4 text-lg text-white/90">Everything. Cancel anytime.</p>
                </div>

                <div className="px-10 py-12 text-center">
                  <div className="text-6xl mb-8">✨</div>
                  <p className="text-2xl font-semibold text-gray-800 mb-8">
                    Everything you need.<br/>Nothing you don't.
                  </p>

                  <Link
                    href="/sign-up"
                    className="block bg-gradient-to-r from-secondary-400 to-secondary-500 text-white px-10 py-5 rounded-2xl text-2xl font-bold hover:from-secondary-500 hover:to-secondary-600 transition-all shadow-lifted hover:shadow-strong mb-6"
                  >
                    Start 7 days free
                  </Link>

                  <p className="text-gray-500">No credit card until day 8</p>
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
          <div className="bg-gradient-to-br from-primary-500 via-accent-400 to-secondary-400 rounded-3xl px-10 py-24 text-center text-white relative overflow-hidden shadow-lifted">
            <div className="relative z-10">
              <div className="text-8xl mb-8">💕</div>
              <h2 className="text-5xl md:text-7xl font-bold mb-8">
                Ready to breathe again?
              </h2>
              <p className="text-2xl md:text-3xl text-white/95 mb-12 max-w-2xl mx-auto font-medium">
                Join the moms who stopped juggling and started living.
              </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-12 py-6 text-2xl font-bold bg-white text-primary-600 rounded-2xl hover:bg-warm-50 transition-all shadow-strong hover:shadow-xl transform hover:-translate-y-1"
            >
              Start free today
              <svg className="w-7 h-7 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </Link>
              <p className="mt-8 text-lg text-white/90">
                7 days free • No credit card needed
              </p>
            </div>
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
                <li><Link href="/support" className="hover:text-gray-900 transition">Help Center</Link></li>
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
