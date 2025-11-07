# Required Vercel Environment Variables

These environment variables **MUST** be set in your Vercel project settings for the build to succeed.

## Setup Instructions

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each of the following variables for **Production**, **Preview**, and **Development** environments

## Required Variables

### Authentication & Database

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... or pk_live_...
CLERK_SECRET_KEY=sk_test_... or sk_live_...

# Convex Database
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-name

# Application URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Email & Calendar Integration

```bash
# Google OAuth (for Gmail & Calendar)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Resend (for email notifications)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### SMS Notifications (Optional)

```bash
# Twilio (for SMS reminders)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Cron Job Security

```bash
# Generate a random secret for cron job authentication
CRON_SECRET=your-random-secret-string
```

## Where to Get These Values

- **Clerk**: https://dashboard.clerk.com/last-active?path=api-keys
- **Convex**: https://dashboard.convex.dev (after deploying your backend)
- **Google OAuth**: https://console.cloud.google.com/apis/credentials
- **Resend**: https://resend.com/api-keys
- **Twilio**: https://console.twilio.com/

## Build Errors?

If you see errors like:
- ❌ "Missing NEXT_PUBLIC_CONVEX_URL environment variable"
- ❌ "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable"
- ❌ "The publishableKey passed to Clerk is invalid"
- ❌ "No address provided to ConvexReactClient"

**Solution**: You must set the environment variables listed above in your Vercel project settings **before** deploying. The build cannot succeed without them.

## Testing Locally

Create a `.env.local` file in your project root with all the variables above. This file is gitignored for security.
