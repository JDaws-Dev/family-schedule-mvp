# Weekend MVP Setup Checklist

Use this checklist to ensure you have everything set up correctly.

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

## Service Accounts Needed

### Friday Night Setup

- [ ] Create Convex account at convex.dev
- [ ] Create Clerk account at clerk.com
- [ ] Create Google Cloud Console project
- [ ] Create OpenAI account
- [ ] Create Stripe account
- [ ] Create Twilio account (for SMS)
- [ ] Create Resend account (for email)

## Step-by-Step Setup

### 1. Convex Setup (15 minutes)

- [ ] Sign up at convex.dev
- [ ] Create new project
- [ ] Run `npx convex dev` in project
- [ ] Copy deployment URL to .env.local as `NEXT_PUBLIC_CONVEX_URL`
- [ ] Verify schema deployed successfully

### 2. Clerk Setup (10 minutes)

- [ ] Sign up at clerk.com
- [ ] Create new application
- [ ] Copy publishable key to .env.local as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] Copy secret key to .env.local as `CLERK_SECRET_KEY`
- [ ] Configure redirect URLs in Clerk dashboard:
  - [ ] Sign in URL: `/sign-in`
  - [ ] Sign up URL: `/sign-up`
  - [ ] After sign in: `/dashboard`
  - [ ] After sign up: `/dashboard`
- [ ] Test sign up and sign in

### 3. Google Cloud Console - Gmail API (20 minutes)

- [ ] Go to console.cloud.google.com
- [ ] Create new project: "Family Schedule MVP"
- [ ] Enable Gmail API
- [ ] Create OAuth 2.0 credentials:
  - [ ] Application type: Web application
  - [ ] Add redirect URI: `http://localhost:3000/api/auth/google/callback`
  - [ ] Add redirect URI: `https://yourdomain.com/api/auth/google/callback` (for production)
- [ ] Copy Client ID to .env.local as `GOOGLE_CLIENT_ID`
- [ ] Copy Client Secret to .env.local as `GOOGLE_CLIENT_SECRET`
- [ ] Download credentials JSON (keep safe)

### 4. OpenAI Setup (5 minutes)

- [ ] Sign up at platform.openai.com
- [ ] Add payment method
- [ ] Create API key
- [ ] Copy to .env.local as `OPENAI_API_KEY`
- [ ] Set usage limits (recommended: $20/month)

### 5. Stripe Setup (15 minutes)

- [ ] Sign up at stripe.com
- [ ] Switch to test mode
- [ ] Create product:
  - [ ] Name: "Family Schedule"
  - [ ] Billing: Recurring
  - [ ] Price: $9.99/month
  - [ ] Free trial: 7 days
- [ ] Copy Secret Key to .env.local as `STRIPE_SECRET_KEY`
- [ ] Copy Publishable Key to .env.local as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Copy Price ID to .env.local as `STRIPE_PRICE_ID`
- [ ] Install Stripe CLI for webhook testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```
- [ ] Copy webhook secret to .env.local as `STRIPE_WEBHOOK_SECRET`

### 6. Twilio Setup (10 minutes)

- [ ] Sign up at twilio.com
- [ ] Get trial phone number
- [ ] Copy Account SID to .env.local as `TWILIO_ACCOUNT_SID`
- [ ] Copy Auth Token to .env.local as `TWILIO_AUTH_TOKEN`
- [ ] Copy Phone Number to .env.local as `TWILIO_PHONE_NUMBER`
- [ ] Add verified test numbers (up to 5 on trial)

### 7. Resend Setup (5 minutes)

- [ ] Sign up at resend.com
- [ ] Verify email address
- [ ] (Optional) Add custom domain for production
- [ ] Create API key
- [ ] Copy to .env.local as `RESEND_API_KEY`
- [ ] Set FROM email as `RESEND_FROM_EMAIL`

### 8. Test Environment Variables

- [ ] Copy .env.local.example to .env.local
- [ ] Fill in all required values
- [ ] Verify no "your-" placeholder values remain
- [ ] Test app starts without errors: `npm run dev`

## Development Workflow

### Daily Checks

- [ ] Convex dev running in terminal 1
- [ ] Next.js dev server running in terminal 2
- [ ] No errors in browser console
- [ ] Hot reload working

### Before Pushing Code

- [ ] .env.local is in .gitignore
- [ ] No API keys in code
- [ ] No sensitive data committed
- [ ] Test build: `npm run build`

### Before Going Live

- [ ] Test full user signup flow
- [ ] Test Gmail connection
- [ ] Test event extraction
- [ ] Test calendar view
- [ ] Test reminder sending
- [ ] Test Stripe subscription
- [ ] Verify all webhooks working
- [ ] Test on mobile device
- [ ] Add custom domain
- [ ] Switch Stripe to live mode
- [ ] Update all production URLs

## Troubleshooting

### Common Issues

**Convex not connecting:**
- Check NEXT_PUBLIC_CONVEX_URL is correct
- Verify `npx convex dev` is running
- Clear browser cache

**Clerk auth not working:**
- Verify redirect URLs match exactly
- Check middleware.ts is configured
- Ensure ClerkProvider wraps app

**Gmail API errors:**
- Verify OAuth credentials are correct
- Check redirect URI matches exactly
- Ensure Gmail API is enabled in Google Cloud

**OpenAI rate limits:**
- Set usage limits in OpenAI dashboard
- Implement request throttling
- Cache common responses

**Stripe webhooks failing:**
- Use Stripe CLI for local testing
- Verify webhook secret is correct
- Check endpoint is publicly accessible

## Cost Monitoring

Set up alerts for:
- [ ] OpenAI API usage
- [ ] Twilio SMS costs
- [ ] Stripe transaction volume
- [ ] Vercel bandwidth

## Security Checklist

- [ ] All API keys in environment variables
- [ ] No secrets in client-side code
- [ ] HTTPS enforced in production
- [ ] CSP headers configured
- [ ] Rate limiting on API routes
- [ ] Input validation on all forms
- [ ] SQL injection prevention (Convex handles this)
- [ ] XSS prevention (React handles this)

## Ready to Launch?

- [ ] All features working end-to-end
- [ ] Tested with 3+ real users
- [ ] Mobile responsive
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Analytics setup (optional)
- [ ] Terms of service page
- [ ] Privacy policy page
- [ ] Support email configured

## Post-Launch

- [ ] Monitor error logs daily
- [ ] Track signup conversions
- [ ] Gather user feedback
- [ ] Fix critical bugs within 24h
- [ ] Plan feature improvements
- [ ] Set up customer support system

---

**Pro Tip:** Don't try to build everything at once. Get the MVP working with basic features, then iterate based on real user feedback!
