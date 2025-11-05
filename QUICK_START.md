# Quick Start - Get Running in 30 Minutes

Follow these steps to get your MVP running locally RIGHT NOW.

## Step 1: Install Dependencies (Already Done ✅)

Your project is already set up with all dependencies installed.

## Step 2: Set Up Convex (10 minutes)

1. **Create Convex account:**
   - Go to [convex.dev](https://convex.dev)
   - Sign up with GitHub or email

2. **Initialize Convex in your project:**
   ```bash
   cd /Users/jeremiahdaws/Documents/family-schedule-mvp
   npx convex dev
   ```

3. **Follow the prompts:**
   - Select "Create a new project"
   - Name it "family-schedule-mvp"
   - It will deploy your schema automatically

4. **Copy the deployment URL:**
   - Look for the URL in the terminal output
   - It will look like: `https://your-project.convex.cloud`
   - Add to `.env.local`:
     ```
     NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
     ```

## Step 3: Set Up Clerk (10 minutes)

1. **Create Clerk account:**
   - Go to [clerk.com](https://clerk.com)
   - Sign up with GitHub or email

2. **Create new application:**
   - Click "Add application"
   - Name it "Family Schedule"
   - Choose authentication methods: Email + Google

3. **Get your API keys:**
   - Go to "API Keys" in the sidebar
   - Copy "Publishable key" and "Secret key"
   - Add to `.env.local`:
     ```
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxx
     CLERK_SECRET_KEY=sk_test_xxxxxx
     ```

4. **Configure redirect URLs:**
   - Go to "Paths" in Clerk dashboard
   - Set these values:
     - Sign-in path: `/sign-in`
     - Sign-up path: `/sign-up`
     - After sign-in: `/dashboard`
     - After sign-up: `/dashboard`
   - Save changes

## Step 4: Start Development Server (2 minutes)

Open TWO terminal windows:

**Terminal 1 - Convex:**
```bash
cd /Users/jeremiahdaws/Documents/family-schedule-mvp
npx convex dev
```

**Terminal 2 - Next.js:**
```bash
cd /Users/jeremiahdaws/Documents/family-schedule-mvp
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Step 5: Test Authentication (5 minutes)

1. Click "Get Started Free" on the landing page
2. Sign up with your email
3. You should see the Clerk sign-up form
4. Complete sign-up
5. You'll be redirected to `/dashboard` (which doesn't exist yet - that's OK!)

**You're now ready to build!**

## What's Working Right Now

✅ Beautiful landing page at [http://localhost:3000](http://localhost:3000)
✅ Sign up at [http://localhost:3000/sign-up](http://localhost:3000/sign-up)
✅ Sign in at [http://localhost:3000/sign-in](http://localhost:3000/sign-in)
✅ Database ready (Convex)
✅ Authentication working (Clerk)

## What to Build Next

Follow the `WEEKEND_IMPLEMENTATION_GUIDE.md` starting with **Saturday Morning** tasks:

1. Dashboard page with Gmail connect button
2. Gmail OAuth integration
3. Email scanning
4. AI event extraction
5. Calendar view
6. Stripe payments
7. Email/SMS reminders

## Optional: Set Up Other Services Later

You can set these up as you build the features that need them:

- **Google Cloud Console** - When you build Gmail integration
- **OpenAI** - When you build event extraction
- **Stripe** - When you build payments
- **Twilio** - When you build SMS reminders
- **Resend** - When you build email reminders

## Troubleshooting

### Convex won't connect
- Make sure `npx convex dev` is running in a terminal
- Check that `NEXT_PUBLIC_CONVEX_URL` is in `.env.local`
- Try restarting both terminals

### Clerk error "Publishable key not valid"
- Double-check you copied the full key from Clerk dashboard
- Make sure it starts with `pk_test_` for test mode
- Restart the Next.js dev server after adding keys

### Page won't load
- Make sure both terminals are running (Convex + Next.js)
- Check browser console for errors
- Try clearing browser cache and refreshing

### Changes not showing up
- Save the file (Cmd+S on Mac, Ctrl+S on Windows)
- Wait a moment for hot reload
- Check terminal for compilation errors

## Current File Structure

```
family-schedule-mvp/
├── app/
│   ├── page.tsx                       # ✅ Landing page
│   ├── layout.tsx                     # ✅ Root layout
│   ├── globals.css                    # ✅ Styles
│   ├── ConvexClientProvider.tsx       # ✅ Convex setup
│   ├── sign-in/[[...sign-in]]/page.tsx # ✅ Sign in
│   └── sign-up/[[...sign-up]]/page.tsx # ✅ Sign up
├── convex/
│   ├── schema.ts                      # ✅ Database schema
│   ├── users.ts                       # ✅ User functions
│   └── events.ts                      # ✅ Event functions
├── .env.local                         # ⚠️ Add your API keys here
├── README.md                          # Full documentation
├── SETUP_CHECKLIST.md                 # All services setup
├── WEEKEND_IMPLEMENTATION_GUIDE.md    # What to build next
└── PROJECT_SUMMARY.md                 # Overview

Legend:
✅ = Complete and working
⚠️ = Needs configuration
```

## Your .env.local Should Look Like This

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://xxxxx.convex.cloud

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Add these later as you build the features:
# Google OAuth (for Gmail integration)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# OpenAI (for event extraction)
# OPENAI_API_KEY=

# Stripe (for payments)
# STRIPE_SECRET_KEY=
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# STRIPE_WEBHOOK_SECRET=
# STRIPE_PRICE_ID=

# Twilio (for SMS)
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_PHONE_NUMBER=

# Resend (for email)
# RESEND_API_KEY=
# RESEND_FROM_EMAIL=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Next Steps

1. ✅ You've got the basic MVP foundation running
2. ⏭️ Start building the dashboard (Saturday Morning in WEEKEND_IMPLEMENTATION_GUIDE.md)
3. 🚀 Follow the guide step-by-step to complete your MVP

**You're ready to build! Open WEEKEND_IMPLEMENTATION_GUIDE.md and start with Saturday Morning tasks.**

Good luck! 🎉
