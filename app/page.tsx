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
              Built by a mom who was drowning in the chaos
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 leading-[1.1] tracking-tight">
              Mama, you can stop<br/>
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">juggling everything in your head</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              The mental load is REAL. Between soccer practice, piano lessons, picture day, the dentist, and remembering which kid needs what on which day... you're exhausted.
              <span className="font-semibold text-slate-900"> It doesn't have to be this hard.</span> Imagine if someone just... handled it all for you. That's what we do.
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

        {/* Sound Familiar? Section */}
        <div className="mb-32">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Does this sound like your life? 😅
            </h2>
            <p className="text-xl text-slate-600">
              You're not a bad mom. You're just trying to hold everything together with your brain full of a million other things.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl border-2 border-orange-200 hover:border-orange-300 transition-all hover:shadow-lg">
              <div className="text-5xl mb-4">😰</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">"OH NO, that was TODAY?!"</h3>
              <p className="text-gray-700 leading-relaxed">
                That sinking feeling when you're at Target and your phone buzzes: "Practice started 30 minutes ago."
                The guilt. The apologizing. The "I'm the worst mom ever" spiral. We've ALL been there.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border-2 border-blue-200 hover:border-blue-300 transition-all hover:shadow-lg">
              <div className="text-5xl mb-4">📧</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">"Where IS that email?!"</h3>
              <p className="text-gray-700 leading-relaxed">
                You KNOW coach sent the game schedule. You SAW it. But now? Lost in 200 unread emails about
                sales, PTA updates, and that one recipe you'll never make. Searching frantically at 6am is not the vibe.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border-2 border-purple-200 hover:border-purple-300 transition-all hover:shadow-lg">
              <div className="text-5xl mb-4">🗓️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">"Is it Tuesday or Thursday?!"</h3>
              <p className="text-gray-700 leading-relaxed">
                Sticky notes on the fridge. A paper calendar. Your Google calendar. TeamSnap. Three group texts.
                Why is everything EVERYWHERE? You just want ONE place to see it all without feeling like you need a computer science degree.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-xl text-slate-700 max-w-3xl mx-auto">
              <span className="font-bold text-primary-600">Here's the truth:</span> You're doing an incredible job with an impossible mental load.
              You deserve something that actually makes your life EASIER. Not another app that requires a tutorial.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="mb-32 scroll-mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 p-12 md:p-16 text-white">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Seriously, it's THIS simple
              </h2>
              <p className="text-xl text-white/90">
                No tutorials. No tech wizardry. Just relief.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold text-lg mb-6 shadow-lg">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-3">Click ONE button</h3>
                <p className="text-white/90 leading-relaxed">
                  Connect your email (Gmail, Yahoo, etc.) with literally one click. That's it. We don't touch anything except activity emails—soccer, dance, school stuff. Your personal emails? We don't even look.
                </p>
              </div>
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold text-lg mb-6 shadow-lg">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-3">We do ALL the work</h3>
                <p className="text-white/90 leading-relaxed">
                  Like having a personal assistant, we read those messy coach emails and pull out what matters: when, where, what time. Then we put it all in one beautiful calendar. You literally do NOTHING.
                </p>
              </div>
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold text-lg mb-6 shadow-lg">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-3">Show up like a rockstar</h3>
                <p className="text-white/90 leading-relaxed">
                  Get gentle reminders before each event. Share with your partner so you're BOTH in the loop. Check it on your phone, tablet, wherever. Just show up on time and be the organized mom you always wanted to be.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Powerful Features Showcase */}
        <div className="mb-20">
          <div className="bg-gradient-to-br from-primary-600 via-secondary-500 to-primary-700 rounded-3xl p-1 shadow-lifted">
            <div className="bg-white rounded-[22px] p-8 md:p-12">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-full text-sm font-bold text-primary-700 mb-4">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                  </svg>
                  THE ANSWER TO YOUR PRAYERS
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                  Everything you've been wishing for<br/>(but thought was impossible)
                </h2>
                <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                  Forget complicated apps and tech overwhelm. This actually makes your life easier—we promise.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {/* Email Scanning */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-7 rounded-2xl border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      📧
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">We Read Your Emails For You</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Seriously. We automatically find those coach emails, practice schedules, and school announcements buried in your inbox. Then we pull out the important stuff—when, where, what time—and put it on your calendar. You do absolutely nothing.
                  </p>
                </div>

                {/* Add Events Multiple Ways */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-7 rounded-2xl border-2 border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      📸
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Snap a Photo & Done</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Got a flyer from school? Just take a picture of it. We read it and add it to your calendar. You can also paste text, speak it out loud (while driving!), or type it. Whatever's easiest for you in that moment.
                  </p>
                </div>

                {/* Live Calendar Sync */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-7 rounded-2xl border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-lg group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      📱
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">It's On Your Phone Already</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Everything shows up in your regular phone calendar (Google Calendar). No switching apps. No remembering passwords. Just open your calendar like you always do—it's all there. Phone, tablet, computer. Everywhere.
                  </p>
                </div>

                {/* Smart Notifications */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-7 rounded-2xl border-2 border-orange-200 hover:border-orange-400 transition-all hover:shadow-lg group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      ⏰
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Gentle Reminders (Not Annoying Ones)</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Get a text or email before each activity—however much heads-up YOU want. 1 hour? 1 day? 2 days? You pick. No more "wait was that today?!" moments. No more guilt. Just show up.
                  </p>
                </div>

                {/* Local Event Discovery */}
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-7 rounded-2xl border-2 border-yellow-200 hover:border-yellow-400 transition-all hover:shadow-lg group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🎪
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Find Fun Stuff Near You</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Looking for summer camps? Saturday activities? That "thing to keep them busy this weekend"? We show you what's happening near you—by age and interest. Add it to your calendar with one tap. Easy.
                  </p>
                </div>

                {/* Family Sharing */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-7 rounded-2xl border-2 border-teal-200 hover:border-teal-400 transition-all hover:shadow-lg group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      💑
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Your Partner Actually Knows What's Happening</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    The SECOND you add something, your spouse sees it. No more "you didn't tell me!" arguments. No more texting schedules back and forth. You're finally, FINALLY on the same page. Game changer.
                  </p>
                </div>
              </div>

              {/* Mobile Optimized Badge */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full text-sm font-semibold text-purple-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                  </svg>
                  Works perfectly on your phone (because let's be real, that's where you live)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mb-32 scroll-mt-20">
          <div className="bg-slate-50 rounded-3xl p-12 md:p-16">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                The "how did I ever live without this?" moments
              </h2>
              <p className="text-xl text-gray-600">
                Here's what changes when you actually have your life together
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-strong transition-all hover:-translate-y-1 duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">No more email hunting at 6am</h3>
                <p className="text-gray-600 leading-relaxed">
                  Remember frantically searching your inbox for that schedule while half-awake? Yeah, that's done. We find every single activity email and handle it for you. You can actually drink your coffee in peace.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-strong transition-all hover:-translate-y-1 duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Your spouse is no longer "clueless"</h3>
                <p className="text-gray-600 leading-relaxed">
                  The second you add something, they see it. No more explaining the schedule. No more "you never told me!" fights. They can actually pull their weight because they KNOW what's happening. Revolutionary, right?
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-strong transition-all hover:-translate-y-1 duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Stop the guilt spiral</h3>
                <p className="text-gray-600 leading-relaxed">
                  You know that horrible feeling when you forget something and feel like the world's worst mom? That's over. Gentle reminders keep you on track without the panic. You actually show up on time. With the right stuff. Imagine that.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-strong transition-all hover:-translate-y-1 duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Use the calendar you already use</h3>
                <p className="text-gray-600 leading-relaxed">
                  We don't make you learn some new app. Everything shows up in your phone's calendar—you know, the one you already check? Google Calendar. That's it. One less thing to remember. One less password to forget.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof - Real Families */}
        <div className="mb-32">
          <div className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 rounded-3xl p-12 md:p-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Real moms, real tears of joy
              </h2>
              <p className="text-xl text-gray-600">
                (Okay, maybe we're being dramatic. But these are real testimonials!)
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-8 rounded-2xl shadow-medium hover:shadow-strong transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    S
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Sarah M.</h4>
                    <p className="text-sm text-gray-600">Mom of 3 in Atlanta</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed italic text-lg">
                  "I literally cried the first time I didn't forget something. I used to have sticky notes on the fridge, in my car, on my bathroom mirror. Now? I just... know. My kids asked if I took a class or something. 😂"
                </p>
                <div className="mt-4 flex items-center gap-1">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-medium hover:shadow-strong transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    J
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Jessica T.</h4>
                    <p className="text-sm text-gray-600">Mom of 2 in Denver</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed italic text-lg">
                  "My husband and I used to FIGHT about the schedule. Now he can't use 'you never told me' as an excuse. He actually knows when practice is. Marriage saver, honestly. Worth way more than $10/month."
                </p>
                <div className="mt-4 flex items-center gap-1">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-medium hover:shadow-strong transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    L
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Lisa K.</h4>
                    <p className="text-sm text-gray-600">Single mom of 2 in Phoenix</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed italic text-lg">
                  "Being a single mom means there's NO backup when I mess up. This takes the mental load OFF my shoulders. I don't spend 2am lying awake trying to remember if soccer is Tuesday or Thursday. I sleep now. SLEEP!"
                </p>
                <div className="mt-4 flex items-center gap-1">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-medium hover:shadow-strong transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    M
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Maria G.</h4>
                    <p className="text-sm text-gray-600">Mom of 4 in San Antonio</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed italic text-lg">
                  "I'm not tech-savvy AT ALL. I barely figured out Facebook. But this? One click and it just... works? I don't even know how, but I don't care. My 65-year-old mother-in-law could use this. That's how easy it is."
                </p>
                <div className="mt-4 flex items-center gap-1">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div id="pricing" className="mb-32 scroll-mt-20">
          <div className="bg-slate-50 rounded-3xl p-12 md:p-16">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Basically the cost of NOT getting Starbucks twice
              </h2>
              <p className="text-xl text-slate-600">
                (But this will actually change your life. Unlike the latte.)
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
                    <span className="text-gray-700">We read your emails and handle everything</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Snap photos of flyers or just talk to your phone</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Shows up in your regular phone calendar (no new app to learn!)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Gentle reminders so you never forget again</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Find fun activities near you for the kids</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Your spouse FINALLY knows what's happening</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Works for every kid, every email, everything</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">Super easy to use (even if you're "not a tech person")</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-gray-700">No hidden fees, no tricks, cancel anytime</span>
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
          <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 rounded-3xl px-8 py-20 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 text-6xl">⚽</div>
              <div className="absolute top-20 right-20 text-6xl">🎵</div>
              <div className="absolute bottom-10 left-1/4 text-6xl">🎨</div>
              <div className="absolute bottom-20 right-1/3 text-6xl">⚾</div>
            </div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Mama, you deserve this.
              </h2>
              <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                You're already doing SO much. Let us handle the schedule chaos so you can actually breathe. Seven days free—no credit card required until you're 100% sure this is the miracle you've been praying for.
              </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-white text-primary-600 rounded-xl hover:bg-gray-50 transition-all shadow-strong hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Yes! Give me my sanity back
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
              <p className="mt-6 text-sm text-white/80">
                7 days free, then $9.99/month • Cancel anytime (but you won't want to)
              </p>
              <p className="mt-4 text-base text-white/90 italic">
                P.S. Your partner will wonder how you suddenly became so organized. Let them think you're just that good. 😉
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
