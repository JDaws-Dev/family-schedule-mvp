# Debug Steps for Gmail Push Notifications

## Recent Fixes Applied

### Fix 1: Gmail Date Format Issue (CRITICAL)
**Problem**: Gmail API `after:` parameter was receiving Unix timestamp instead of required date format.
- **Wrong**: `after:1234567890` (Unix timestamp)
- **Correct**: `after:2025/11/04` (YYYY/MM/DD format)

**Location**: `/app/api/scan-emails/route.ts` lines 330-340

**Symptoms**: Gmail query returns 0 messages even though matching emails exist.

### Fix 2: Removed Keyword Filtering
**Problem**: Keyword filtering was too restrictive (was searching for: class, practice, game, tournament, etc.)
- Many relevant emails don't contain these specific keywords
- Better to let AI filter all recent emails than miss events due to keyword mismatch

**Change**: Now scans ALL emails from last 7 days, AI does the filtering.

**Location**: `/app/api/scan-emails/route.ts` lines 330-340

### Fix 3: Lowered Confidence Threshold
**Problem**: Events without explicit family member names were filtered out if confidence < 0.6
- Social events like "movie night" didn't mention kids' names
- AI gave these lower confidence scores, so they were incorrectly filtered

**Change**: Lowered threshold from 0.6 to 0.5 for events without family member names.

**Location**: `/app/api/scan-emails/route.ts` lines 257-265

---

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
- `[scan-emails]` messages showing how many emails were found
- `[extractEventsFromEmail]` messages showing what AI extracted
- Any ERROR messages

## Common Issues

### No emails found (returns 0 messages)
1. Check that Gmail date format is `YYYY/MM/DD` not Unix timestamp
2. Check Vercel logs for the actual Gmail query being used
3. Verify emails exist in the date range (last 7 days by default)

### Emails found but events not showing up
1. Check `[extractEventsFromEmail]` logs to see what AI returned
2. Verify confidence scores - events need >= 0.5 confidence if no family member mentioned
3. Check if email was already processed (won't reprocess same email)

### Test email not appearing
Send a test email like: "Want to come to my movie night? We're watching Star Wars. November 21st. 8pm"
- Should be detected with confidence >= 0.5
- Check logs for filtering reasons

## What to share when debugging:

1. Browser console errors
2. Do you have a Gmail account connected? (yes/no)
3. What happens when you click the button?
4. Results from the curl commands above
5. Vercel logs showing the scan-emails execution
