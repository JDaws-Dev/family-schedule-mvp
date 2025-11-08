# Gmail Push Notifications Setup Guide

This guide walks you through setting up real-time Gmail push notifications using Google Cloud Pub/Sub.

## Overview

Instead of polling Gmail daily, push notifications send an instant webhook when new emails arrive, enabling real-time event detection.

## Prerequisites

- Google Cloud Project with Gmail API enabled
- Billing enabled (Pub/Sub has a generous free tier)
- `gcloud` CLI installed (optional but recommended)

## Setup Steps

### 1. Create a Pub/Sub Topic

```bash
# Set your project ID
export PROJECT_ID="your-google-cloud-project-id"

# Create the topic
gcloud pubsub topics create gmail-notifications --project=$PROJECT_ID
```

**Or use Google Cloud Console:**
1. Go to [Pub/Sub Topics](https://console.cloud.google.com/cloudpubsub/topic)
2. Click "CREATE TOPIC"
3. Topic ID: `gmail-notifications`
4. Click "CREATE"

### 2. Grant Gmail API Permission

Gmail needs permission to publish to your topic:

```bash
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher \
  --project=$PROJECT_ID
```

**Or use Google Cloud Console:**
1. Go to your topic: `gmail-notifications`
2. Click "PERMISSIONS" tab
3. Click "ADD PRINCIPAL"
4. Principal: `gmail-api-push@system.gserviceaccount.com`
5. Role: "Pub/Sub Publisher"
6. Click "SAVE"

### 3. Create a Push Subscription

This tells Pub/Sub to send messages to your webhook:

```bash
# Your webhook URL (use your actual domain in production)
export WEBHOOK_URL="https://your-domain.com/api/gmail-webhook"

gcloud pubsub subscriptions create gmail-webhook-subscription \
  --topic=gmail-notifications \
  --push-endpoint=$WEBHOOK_URL \
  --project=$PROJECT_ID
```

**For local development:**
Use a tunneling service like ngrok:
```bash
ngrok http 3000
# Use the ngrok URL: https://abc123.ngrok.io/api/gmail-webhook
```

### 4. Configure Environment Variables

Add to your `.env.local`:

```env
# Full Pub/Sub topic path
GOOGLE_PUBSUB_TOPIC=projects/your-project-id/topics/gmail-notifications

# Your app URL (for webhooks)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 5. Set Up Gmail Watch for Each Account

After connecting a Gmail account, set up push notifications:

**API Call:**
```bash
curl -X POST https://your-domain.com/api/gmail-watch \
  -H "Content-Type: application/json" \
  -d '{"accountId": "gmail-account-id"}'
```

**Or create a settings UI:**
- Add a "Enable Real-time Sync" button for each Gmail account
- Call `/api/gmail-watch` when clicked
- Watch expires after 7 days, needs renewal

### 6. Verify Setup

1. Send a test email to the connected Gmail account
2. Check logs: Should see webhook notification within seconds
3. Verify event appears in review section

## Architecture Flow

```
New Email Arrives
    ↓
Gmail API detects change
    ↓
Gmail publishes to Pub/Sub topic
    ↓
Pub/Sub pushes to /api/gmail-webhook
    ↓
Webhook calls /api/scan-emails-push
    ↓
Email scanned, events extracted
    ↓
Events appear in review section
```

## Troubleshooting

### "Permission denied" error
- Verify `gmail-api-push@system.gserviceaccount.com` has Publisher role
- Check IAM permissions in Google Cloud Console

### Webhook not receiving notifications
- Verify subscription push endpoint URL is correct
- Check webhook is publicly accessible (not localhost)
- Test with ngrok for local development

### Watch expires
- Gmail watches expire after 7 days
- Set up a cron job to renew watches weekly
- Call `/api/gmail-watch` for each account

## Costs

**Pub/Sub Pricing:**
- First 10 GB/month: **FREE**
- After 10 GB: $0.40 per million messages

**Estimated for family app:**
- ~100-1000 emails/month per family
- Well within free tier
- Cost: **$0/month** for most users

## Automatic Watch Renewal

Add a cron job to renew watches weekly:

**File:** `app/api/cron/renew-gmail-watches/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all Gmail accounts
  const families = await convex.query(api.families.getAllFamilies);

  for (const family of families) {
    const accounts = await convex.query(api.gmailAccounts.getActiveGmailAccounts, {
      familyId: family._id,
    });

    // Renew watch for each account
    for (const account of accounts) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gmail-watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account._id }),
      });
    }
  }

  return NextResponse.json({ success: true });
}
```

**Vercel cron config:** `vercel.json`

```json
{
  "crons": [{
    "path": "/api/cron/renew-gmail-watches",
    "schedule": "0 0 * * 0"
  }]
}
```

This runs weekly on Sundays at midnight.

## Security

- Webhook endpoint should verify requests are from Google
- Use Pub/Sub push authentication
- Store API tokens securely in environment variables
- Never commit tokens to git

## References

- [Gmail Push Notifications](https://developers.google.com/gmail/api/guides/push)
- [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
