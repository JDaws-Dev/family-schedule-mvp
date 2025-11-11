# Our Daily Family - Family Schedule Assistant

> Never miss a kid's activity again. Automatically scan emails and organize events into one calendar.

**Status:** ✅ Production Ready | **Version:** 1.0 with automatic retry
**Live App:** https://family-schedule-mvp.vercel.app/

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Google Calendar Sync](#google-calendar-sync)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)

---

## Overview

A weekend MVP project that helps busy parents manage their kids' activities by automatically scanning emails and organizing events into one calendar with Google Calendar integration.

### Target Audience
- Busy moms with 2+ kids
- Ages 30-45
- Household income $75k+
- Homeschool or private school families
- Multiple activities per child

### Pain Points Solved
1. Overwhelmed by activity emails
2. Can't find event details when needed
3. Miss important deadlines and RSVPs
4. Juggling multiple calendars/apps
5. Mental load of tracking everything

---

## Features

### ✅ Implemented Features

- **Beautiful Landing Page** - Mom-focused messaging optimized for busy parents
- **User Authentication** - Secure login with Clerk
- **Convex Database** - Real-time sync with serverless backend
- **Gmail Integration** - Connect Gmail to scan for activity emails
- **AI Event Extraction** - OpenAI GPT-4 powered event detection
- **Family Calendar** - Unified view of all kids' activities
- **Google Calendar Sync** - Two-way sync with automatic retry system
- **Event Management** - Create, edit, delete, and confirm events
- **Email & SMS Reminders** - Notifications via Resend and Twilio
- **Stripe Subscriptions** - $9.99/month payment processing
- **UX Improvements** - Search, bulk operations, keyboard shortcuts, color-coding
- **Mobile Responsive** - Touch-optimized interface with 44px+ targets

### 🔄 Google Calendar Sync Features

- ✅ Automatic sync from app to Google Calendar
- ✅ Real-time webhook sync from Google Calendar to app
- ✅ Exponential backoff retry system (1min → 5min → 15min → 1hr → 4hr)
- ✅ Background cron job (every 30 minutes)
- ✅ Sync status tracking per event
- ✅ Manual retry functions
- ✅ Conflict resolution (last-write-wins)
- ✅ All-day event support

### 🚧 Partially Complete

- **Calendar View Toggles** - State ready, UI pending for week/day views

---

## Tech Stack

### Core
- **Frontend:** Next.js 16, React 19, TypeScript
- **Database:** Convex (real-time, serverless)
- **Authentication:** Clerk
- **Styling:** Tailwind CSS

### Integrations
- **Email:** Gmail API
- **AI:** OpenAI GPT-4
- **Payments:** Stripe
- **Calendar:** Google Calendar API
- **Notifications:** Resend (email) + Twilio (SMS)
- **Hosting:** Vercel

### Libraries
- react-big-calendar - Calendar UI
- driver.js - Onboarding tours
- date-fns - Date utilities
- ics - iCal generation
- googleapis - Google API client

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Accounts: Convex, Clerk, Google Cloud, OpenAI, Stripe, Twilio, Resend

### Installation

```bash
# Clone and install
cd family-schedule-mvp
npm install

# Set up Convex
npx convex dev

# Copy environment template
cp .env.local.example .env.local
# Fill in all environment variables (see .env.local.example)

# Run development servers
# Terminal 1:
npx convex dev

# Terminal 2:
npm run dev
```

### Environment Variables

Create `.env.local` with:

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

# Google OAuth & Calendar
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

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Service Setup

#### 1. Convex
1. Go to [convex.dev](https://convex.dev)
2. Create new project
3. Run `npx convex dev`
4. Copy deployment URL

#### 2. Clerk
1. Go to [clerk.com](https://clerk.com)
2. Create application
3. Configure redirect URLs
4. Copy API keys

#### 3. Google Cloud Console
1. Create project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable Gmail API and Google Calendar API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs
5. Copy Client ID and Secret

#### 4. OpenAI
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Set usage limits ($20/month recommended)

#### 5. Stripe
1. Go to [stripe.com](https://stripe.com)
2. Create product: "Family Schedule" at $9.99/month
3. Copy keys and Price ID
4. Set up webhook: `/api/webhooks/stripe`

#### 6. Twilio
1. Go to [twilio.com](https://twilio.com)
2. Get phone number
3. Copy Account SID and Auth Token

#### 7. Resend
1. Go to [resend.com](https://resend.com)
2. Create API key
3. Verify sending domain

---

## Google Calendar Sync

### Current Status

**Status:** 🟡 System Built & Deployed, OAuth Token Issue Blocking Sync
**Last Updated:** November 10, 2025

### What's Working
- ✅ Sync code complete and deployed
- ✅ Retry mechanism with exponential backoff
- ✅ Background cron job runs every 30 minutes
- ✅ Error handling and logging
- ✅ Token refresh logic
- ✅ Manual retry functions

### Known Issue
**Problem:** OAuth token lacks Calendar permissions (only has Gmail read permissions)

**Solution:**
1. Go to https://myaccount.google.com/permissions
2. Remove "Our Daily Family" app access
3. Re-connect Gmail in app Settings → Apps tab
4. Verify permissions include:
   - ☑ See and download your email messages
   - ☑ See, edit, share, and permanently delete all calendars
5. Click "Allow"
6. Re-select calendar

### Sync Flow

```
User Creates Event
    ↓
syncStatus: "pending"
    ↓
Immediate Sync Attempt
    ↓
[Success] → syncStatus: "synced" ✓
    ↓
[Failure] → Retry with backoff
    Retry 1: 1 minute
    Retry 2: 5 minutes
    Retry 3: 15 minutes
    Retry 4: 1 hour
    Retry 5: 4 hours
    ↓
[Max retries exceeded] → Manual intervention needed
```

### Manual Retry Functions

```typescript
// Retry single event
const retrySyncEvent = useMutation(api.calendarSync.retrySyncForEvent);
await retrySyncEvent({ eventId: event._id });

// Retry all family events
const retrySyncFamily = useMutation(api.calendarSync.retrySyncForFamily);
const result = await retrySyncFamily({ familyId: family._id });
```

### Monitoring

**Check production logs:**
```bash
npx convex logs --prod
```

**Look for:**
- ✅ `[CALENDAR SYNC] Successfully synced event`
- ✅ `[CALENDAR SYNC] Event created in Google Calendar with ID:`
- ❌ `401` or `Invalid Credentials`

**Check event sync status:**
```javascript
// In Convex dashboard
db.query("events")
  .withIndex("by_sync_status", q => q.eq("syncStatus", "failed"))
  .collect()
```

### Success Criteria

✅ System is working when:
1. New events appear in Google Calendar within 10 seconds
2. No 401 errors in production logs
3. All events show `syncStatus: "synced"`
4. Cron job runs successfully every 30 minutes
5. Manual retry functions work correctly

---

## Development

### Project Structure

```
family-schedule-mvp/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout with providers
│   ├── ConvexClientProvider.tsx    # Convex provider
│   ├── components/                 # Shared components
│   │   ├── ConfirmDialog.tsx       # Confirmation modals
│   │   ├── LoadingSpinner.tsx      # Loading indicators
│   │   ├── HamburgerMenu.tsx       # Mobile menu
│   │   └── MobileNav.tsx           # Mobile navigation
│   ├── sign-in/                    # Clerk sign in
│   ├── sign-up/                    # Clerk sign up
│   ├── dashboard/                  # Main dashboard
│   ├── calendar/                   # Calendar view
│   ├── review/                     # Review AI-extracted events
│   ├── discover/                   # Discover new events
│   ├── settings/                   # User settings
│   ├── onboarding/                 # First-time user setup
│   └── api/
│       ├── auth/google/            # Gmail OAuth
│       ├── events/                 # Event management
│       ├── reminders/              # Reminder sending
│       ├── webhooks/               # Stripe webhooks
│       ├── sync-from-calendar/     # Google Calendar → App sync
│       └── create-google-calendar/ # App → Google Calendar sync
├── convex/
│   ├── schema.ts                   # Database schema
│   ├── users.ts                    # User queries/mutations
│   ├── events.ts                   # Event queries/mutations
│   ├── families.ts                 # Family management
│   ├── calendarSync.ts             # Calendar sync logic
│   ├── crons.ts                    # Background jobs
│   └── http.ts                     # Webhook handlers
├── components/                     # Legacy components
├── lib/                            # Utility functions
└── middleware.ts                   # Clerk middleware
```

### UX Features Implemented

| Feature | Status | Pages |
|---------|--------|-------|
| Keyboard Shortcuts (ESC) | ✅ | Dashboard, Review, Calendar, Discover, Settings |
| Confirmation Dialogs | ✅ | Dashboard (delete) |
| Loading States | ✅ | Components ready |
| Color-Coding by Category | ✅ | Dashboard event cards |
| Search Functionality | ✅ | Dashboard action items |
| Mobile Touch Targets (44px+) | ✅ | All buttons |
| Calendar View Toggles | ⏳ | State ready, UI pending |
| Improved Error Messages | ✅ | Dashboard |
| Undo for Deletions | ✅ | Dashboard (10s timeout) |
| Bulk Operations | ✅ | Dashboard (select all) |

### Development Workflow

```bash
# Start both servers
# Terminal 1:
npx convex dev

# Terminal 2:
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Deploy Convex
npx convex deploy

# Deploy to Vercel
vercel --prod
```

### Common Commands

```bash
# Check Convex environment variables
npx convex env list
npx convex env list --prod

# View Convex logs
npx convex logs
npx convex logs --prod

# Run Convex function manually
npx convex run calendarSync:retrySyncForFamily '{"familyId": "xxx"}'

# Vercel commands
vercel env ls
vercel logs
vercel inspect [deployment-url]
```

---

## Testing

### Manual Test Scenarios

#### Test 1: Create Event in App → Syncs to Google Calendar
1. Create event in app
2. Check Google Calendar within 10 seconds
3. Verify all details match

#### Test 2: Update Event in App → Updates in Google Calendar
1. Edit existing event
2. Change title and time
3. Verify updates in Google Calendar

#### Test 3: Delete Event in App → Deletes from Google Calendar
1. Delete event in app
2. Verify removal from Google Calendar

#### Test 4: Create Event in Google Calendar → Syncs to App
1. Create event in Google Calendar
2. Wait 5-10 seconds (with webhooks) or manually sync
3. Verify event appears in app

#### Test 5: Search Functionality
1. Go to Dashboard
2. Enter search term
3. Verify filtered results

#### Test 6: Bulk Operations
1. Select multiple events
2. Click "Delete Selected"
3. Verify undo toast appears
4. Test undo within 10 seconds

#### Test 7: Mobile Touch Targets
1. Open on mobile device
2. Verify all buttons are easily tappable (44px+)

### Testing Checklist

**Critical Path:**
- [ ] Build succeeds (`npm run build`)
- [ ] TypeScript validation passes
- [ ] Manual test: Search functionality
- [ ] Manual test: Bulk delete with undo
- [ ] Manual test: ESC key closes modals
- [ ] Manual test: Google Calendar sync
- [ ] Manual test: Mobile touch targets

**Browser Testing:**
- [ ] Chrome Desktop
- [ ] Safari Desktop
- [ ] Firefox Desktop
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Deployment

### Vercel Production

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Set environment variables
vercel env add CONVEX_DEPLOYMENT
vercel env add NEXT_PUBLIC_CONVEX_URL
# ... (set all env vars from .env.local)

# Deploy
vercel --prod
```

### Convex Production

```bash
# Deploy functions
npx convex deploy --prod

# Set environment variables
CONVEX_DEPLOYMENT=prod:modest-ram-699 npx convex env set GOOGLE_CLIENT_ID "xxx"
CONVEX_DEPLOYMENT=prod:modest-ram-699 npx convex env set GOOGLE_CLIENT_SECRET "xxx"

# View logs
CONVEX_DEPLOYMENT=prod:modest-ram-699 npx convex logs
```

### Post-Deployment Checklist

- [ ] Update redirect URIs in Google Cloud Console
- [ ] Update webhook URLs in Stripe
- [ ] Set Convex deployment to production
- [ ] Test full signup flow
- [ ] Test Gmail connection
- [ ] Test Google Calendar sync
- [ ] Test Stripe subscription
- [ ] Verify webhooks working
- [ ] Test on mobile device

---

## Troubleshooting

### Common Issues

#### Convex Not Connecting
- Check `NEXT_PUBLIC_CONVEX_URL` is correct
- Verify `npx convex dev` is running
- Clear browser cache

#### Clerk Auth Not Working
- Verify redirect URLs match exactly
- Check `middleware.ts` is configured
- Ensure ClerkProvider wraps app

#### Gmail API Errors
- Verify OAuth credentials are correct
- Check redirect URI matches exactly
- Ensure Gmail API is enabled

#### Google Calendar Sync 401 Errors
**Cause:** OAuth token lacks Calendar scope
**Solution:** Revoke and reconnect Gmail (see Google Calendar Sync section)

#### Events Not Syncing
1. Check production logs: `npx convex logs --prod`
2. Verify Gmail connected in Settings
3. Verify calendar selected
4. Check Convex env vars: `npx convex env list --prod`
5. Try manual retry: `retrySyncForFamily(familyId)`

#### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Delete `node_modules`: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npx tsc --noEmit`

### Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "Token refresh failed: invalid_grant" | OAuth token expired/revoked | Reconnect Gmail |
| "No Gmail account connected" | No active Gmail account | Connect Gmail |
| "Google Calendar API returned 401" | Unauthorized | Check OAuth permissions |
| "Google Calendar API returned 403" | Forbidden | Check calendar access |
| "Maximum retry attempts (5) exceeded" | All retries failed | Fix root cause, manual retry |

---

## Cost Estimates

### Monthly Costs (Per Customer)

- Clerk: $0 (free up to 10k users)
- Convex: $0 (free tier: 1M function calls)
- OpenAI: ~$0.50-$1.00 (email scanning)
- Twilio SMS: ~$0.30-$0.60 (reminders)
- Resend: $0 (free tier: 3k emails/month)
- Stripe: ~$0.59 (2.9% + $0.30)
- Vercel: $0 (hobby tier)

**Total per customer:** ~$1.50-$2.00/month
**Revenue per customer:** $9.99/month
**Profit per customer:** ~$8/month

### Pricing

- $9.99/month
- 7-day free trial
- Cancel anytime

**Target: 100 customers = $800/month profit**

---

## Business Model

### Marketing Strategy

**Launch Channels:**
1. 3D Jumpstart parent community
2. Local homeschool co-ops
3. Private school parent groups
4. Mom Facebook groups
5. Parenting influencers (affiliate deals)

**Content Ideas:**
- "How I Finally Tamed Our Family Schedule"
- "The Email Inbox Solution for Busy Moms"
- Before/After: Email chaos vs organized calendar
- Testimonials from beta users

### Success Metrics

**Week 1 Goals:**
- 10 sign-ups from 3D Jumpstart parents
- 5 active beta testers
- Scan 100+ emails successfully
- Extract 50+ events correctly

**Month 1 Goals:**
- 50 paying customers
- $500 MRR
- 90%+ event extraction accuracy
- <5% churn rate

**Month 3 Goals:**
- 100 paying customers
- $1,000 MRR
- Positive cash flow
- 5-star reviews

---

## Documentation Files

These files will be archived after consolidation:

- `CHANGES_SUMMARY.md` - Quick summary of changes
- `COST_OPTIMIZATION.md` - Cost analysis
- `GOOGLE_CALENDAR_SYNC_SETUP.md` - Original setup guide
- `GOOGLE_CALENDAR_SYNC_STATUS.md` - Detailed sync status
- `IMPLEMENTATION_GUIDE.md` - Implementation details
- `IMPLEMENTATION_STATUS.md` - UX features status
- `MOM_UX_ANALYSIS.md` - UX research
- `PROJECT_SUMMARY.md` - Original project summary
- `QUICK_REFERENCE.md` - Sync retry system reference
- `QUICK_START.md` - Quick start guide
- `QUICK_SYNC_REFERENCE.md` - Quick sync reference
- `SETUP_CHECKLIST.md` - Setup checklist
- `SYNC_IMPLEMENTATION_SUMMARY.md` - Sync implementation details
- `SYNC_RETRY_IMPLEMENTATION.md` - Retry system details
- `TESTING_GUIDE.md` - Full testing guide
- `UX_IMPLEMENTATION_REPORT.md` - UX implementation report
- `UX_IMPROVEMENTS_SUMMARY.md` - UX improvements summary
- `WEEKEND_IMPLEMENTATION_GUIDE.md` - Weekend guide

---

## Support & Resources

**Documentation:**
- Convex: https://docs.convex.dev
- Clerk: https://clerk.com/docs
- Gmail API: https://developers.google.com/gmail/api
- Google Calendar API: https://developers.google.com/calendar
- OpenAI: https://platform.openai.com/docs
- Stripe: https://stripe.com/docs
- Next.js: https://nextjs.org/docs

**Community:**
- Convex Discord: https://convex.dev/community
- Clerk Discord: https://clerk.com/discord
- Next.js Discussions: https://github.com/vercel/next.js/discussions

---

## License

Private - All Rights Reserved

---

**Version:** 1.0.0
**Last Updated:** November 10, 2025
**Status:** Production Ready
**Maintained By:** JDaws-Dev

For questions or support, check the documentation links above or review the Convex/Vercel logs for debugging.
