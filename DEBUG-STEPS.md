# Debug Steps for Gmail Push Notifications

## Step 1: Check Browser Console

1. Go to: https://family-schedule-mvp.vercel.app/review
2. Press F12 (or Cmd+Option+I on Mac)
3. Click "Console" tab
4. Click "Check for New Emails" button
5. Look for errors (red text)

## Step 2: Test Manual API Call

Open a new terminal and run:

```bash
# Get your Gmail account ID from Settings page, then test:
curl -X POST https://family-schedule-mvp.vercel.app/api/scan-emails \
  -H "Content-Type: application/json" \
  -d '{"accountId": "YOUR_ACCOUNT_ID_HERE"}'
```

## Step 3: Test Push Notification Setup

If you have your Gmail accountId, test the watch endpoint:

```bash
curl -X POST https://family-schedule-mvp.vercel.app/api/gmail-watch \
  -H "Content-Type: application/json" \
  -d '{"accountId": "YOUR_ACCOUNT_ID_HERE"}'
```

## Step 4: Check Vercel Logs

```bash
vercel logs https://family-schedule-mvp.vercel.app
```

Look for:
- `[oauth-callback]` messages when connecting Gmail
- `[Gmail Watch]` messages when setting up push
- `[Gmail Webhook]` messages when receiving notifications
- Any ERROR messages

## What to share with me:

1. Browser console errors
2. Do you have a Gmail account connected? (yes/no)
3. What happens when you click the button?
4. Results from the curl commands above
