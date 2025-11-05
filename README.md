# Family Schedule Assistant MVP

A weekend MVP project that helps busy parents manage their kids' activities by automatically scanning emails and organizing events into one calendar.

## Features

- ✅ Beautiful landing page optimized for busy moms
- ✅ User authentication with Clerk
- ✅ Convex database with real-time sync
- 🚧 Gmail integration for email scanning
- 🚧 AI-powered event extraction (OpenAI)
- 🚧 Family calendar view
- 🚧 Email & SMS reminders
- 🚧 Stripe subscription ($9.99/month)

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Database:** Convex (real-time, serverless)
- **Authentication:** Clerk
- **Email Integration:** Gmail API
- **AI:** OpenAI GPT-4
- **Payments:** Stripe
- **Notifications:** Resend (email) + Twilio (SMS)
- **Hosting:** Vercel

## Quick Start

### 1. Clone and Install

```bash
cd family-schedule-mvp
npm install
```

### 2. Set Up Services

#### Convex Setup
1. Go to [convex.dev](https://convex.dev) and create an account
2. Create a new project
3. Run: `npx convex dev`
4. Copy the deployment URL to `.env.local`

#### Clerk Setup
1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. Copy your publishable and secret keys to `.env.local`
4. In Clerk dashboard, configure redirect URLs:
   - Sign in: `/sign-in`
   - Sign up: `/sign-up`
   - After sign in: `/dashboard`
   - After sign up: `/dashboard`

#### Google Cloud Console (Gmail API)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Client Secret to `.env.local`

#### OpenAI Setup
1. Go to [OpenAI](https://platform.openai.com/)
2. Create an API key
3. Add to `.env.local`

#### Stripe Setup
1. Go to [Stripe](https://stripe.com)
2. Create a product: "Family Schedule" at $9.99/month
3. Copy Secret Key, Publishable Key, and Price ID to `.env.local`
4. Set up webhook endpoint: `/api/webhooks/stripe`

#### Twilio Setup (for SMS)
1. Go to [Twilio](https://www.twilio.com/)
2. Create account and get a phone number
3. Copy Account SID, Auth Token, and Phone Number to `.env.local`

#### Resend Setup (for emails)
1. Go to [Resend](https://resend.com/)
2. Create an API key
3. Verify your sending domain
4. Copy API key to `.env.local`

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```env
# Convex
CONVEX_DEPLOYMENT=your-deployment-url
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# OpenAI
OPENAI_API_KEY=sk-xxxxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID=price_xxxxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Resend
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
# Terminal 1: Start Convex
npx convex dev

# Terminal 2: Start Next.js
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
family-schedule-mvp/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── layout.tsx               # Root layout with providers
│   ├── ConvexClientProvider.tsx # Convex provider
│   ├── sign-in/                 # Clerk sign in
│   ├── sign-up/                 # Clerk sign up
│   ├── dashboard/               # Main dashboard (TODO)
│   ├── calendar/                # Calendar view (TODO)
│   └── api/
│       ├── auth/google/         # Gmail OAuth (TODO)
│       ├── events/              # Event management (TODO)
│       ├── reminders/           # Reminder sending (TODO)
│       └── webhooks/            # Stripe webhooks (TODO)
├── convex/
│   ├── schema.ts                # Database schema
│   ├── users.ts                 # User queries/mutations
│   └── events.ts                # Event queries/mutations
├── components/                   # Reusable components (TODO)
├── lib/                          # Utility functions (TODO)
└── middleware.ts                # Clerk middleware
```

## Weekend Development Roadmap

### Friday Night (3-4 hours) - DONE ✅
- [x] Project setup
- [x] Landing page
- [x] Authentication with Clerk
- [x] Convex schema

### Saturday Morning (4-5 hours)
- [ ] Gmail OAuth integration
- [ ] Email fetching from Gmail API
- [ ] Store email metadata in Convex

### Saturday Afternoon (4-5 hours)
- [ ] OpenAI event extraction prompt
- [ ] Event extraction pipeline
- [ ] Event review/approval UI
- [ ] Manual event creation

### Sunday Morning (4-5 hours)
- [ ] Calendar view (week/month)
- [ ] Stripe checkout integration
- [ ] Subscription management

### Sunday Afternoon (4-5 hours)
- [ ] Email reminders (Resend)
- [ ] SMS reminders (Twilio)
- [ ] Reminder scheduling logic
- [ ] Deploy to Vercel

## Key Files to Build Next

1. **`/app/api/auth/google/route.ts`** - Gmail OAuth flow
2. **`/app/api/events/scan/route.ts`** - Scan emails for events
3. **`/app/api/events/extract/route.ts`** - AI extraction
4. **`/app/dashboard/page.tsx`** - Main dashboard
5. **`/app/calendar/page.tsx`** - Calendar view
6. **`/convex/emails.ts`** - Email processing functions
7. **`/convex/http.ts`** - Webhook handlers

## Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Configure Production Environment

1. Add all environment variables in Vercel dashboard
2. Update redirect URIs in Google Cloud Console
3. Update webhook URLs in Stripe
4. Deploy Convex: `npx convex deploy`

## Cost Estimates (Monthly)

- Clerk: Free (up to 10k users)
- Convex: Free tier (1M function calls)
- OpenAI: ~$10-20 (depends on usage)
- Twilio SMS: ~$0.01 per message
- Resend: Free (3k emails/month)
- Stripe: 2.9% + $0.30 per transaction
- Vercel: Free (hobby tier)

**Estimated per customer:** ~$1-2/month
**Profit per customer:** ~$8/month at $9.99 pricing

## Support & Documentation

- Convex Docs: https://docs.convex.dev
- Clerk Docs: https://clerk.com/docs
- Gmail API: https://developers.google.com/gmail/api
- OpenAI API: https://platform.openai.com/docs
- Stripe Docs: https://stripe.com/docs

## License

Private - All Rights Reserved
