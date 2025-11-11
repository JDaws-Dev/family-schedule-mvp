# Gmail Push Notifications - Current Status

## What's Been Done

### ✅ Completed
1. **Google Cloud Pub/Sub Setup**
   - Topic: `projects/familyscheduler-477219/topics/gmail-notifications`
   - Push subscription created pointing to `/api/gmail-webhook`
   - Gmail API granted publish permissions

2. **Environment Variables**
   - `GOOGLE_PUBSUB_TOPIC` added to Vercel Production
   - Value: `projects/familyscheduler-477219/topics/gmail-notifications`

3. **Code Deployed**
   - Auto-enable push notifications in OAuth callback
   - Manual "Check for New Emails" button added to /review page
   - Cron job to auto-renew watches (expires every 7 days)
   - **FIXED:** Removed missing `GOOGLE_REDIRECT_URI` dependency from `/api/gmail-watch`

4. **Latest Deployment**
   - Commit: `da18a38` - "Fix Gmail push notifications: Remove missing GOOGLE_REDIRECT_URI dependency"
   - Deployed to: https://family-schedule-mvp.vercel.app
   - Deployment ID: `family-schedule-odsum5vjb-family-planner.vercel.app`

## ❌ Current Problem

**Push notifications are NOT working.**

### What Works:
- ✅ Gmail OAuth connection successful
- ✅ Manual email scan button works
- ✅ Endpoints exist (`/api/gmail-watch`, `/api/gmail-webhook`)
- ✅ Environment variables set correctly

### What's Broken:
- ❌ No logs showing push notification setup when Gmail is reconnected
- ❌ No logs showing webhook receiving notifications from Gmail
- ❌ Test emails don't appear automatically

## Investigation Needed

### 1. Verify OAuth Callback is Running Latest Code
Check if OAuth callback at `/api/auth/google/callback` is actually calling `/api/gmail-watch` after connecting Gmail.

**Test:**
- Disconnect and reconnect Gmail at /settings?tab=apps
- Check logs for:
  ```
  [oauth-callback] Auto-enabling push notifications for: email@gmail.com
  [oauth-callback] Push notifications enabled successfully
  ```
  OR
  ```
  [oauth-callback] Failed to enable push notifications: {error}
  ```

### 2. Check if Gmail Watch is Being Created
After reconnecting Gmail, manually test the watch endpoint:

```bash
# Get the new account ID from Settings page, then:
curl -X POST https://family-schedule-mvp.vercel.app/api/gmail-watch \
  -H "Content-Type: application/json" \
  -d '{"accountId": "NEW_ACCOUNT_ID_HERE"}'
```

Expected success response:
```json
{
  "success": true,
  "email": "your@gmail.com",
  "historyId": "123456",
  "expiration": "2025-11-17T...",
  "expiresIn": "7 days"
}
```

### 3. Verify Pub/Sub Subscription is Configured Correctly
Go to Google Cloud Console → Pub/Sub → Subscriptions → `gmail-notifications-sub`

Check:
- Delivery type: **Push** (not Pull)
- Endpoint URL: `https://family-schedule-mvp.vercel.app/api/gmail-webhook`
- Status: Active

### 4. Check Webhook is Accessible
Test if webhook can receive POST requests:

```bash
curl -X POST https://family-schedule-mvp.vercel.app/api/gmail-webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"data":"dGVzdA=="}}'
```

Should return response (not 404).

## Most Likely Issues

### Issue #1: OAuth Callback Not Running Latest Code
**Symptom:** No logs about enabling push notifications when reconnecting Gmail
**Cause:** Cached deployment or code not deployed properly
**Fix:** Hard refresh browser (Ctrl+Shift+R), disconnect/reconnect Gmail

### Issue #2: Gmail Watch Failing Silently
**Symptom:** OAuth callback tries to enable push but fails without visible error
**Cause:** Token refresh failing, Pub/Sub topic permission issues
**Fix:** Check full logs for error messages in OAuth callback

### Issue #3: Pub/Sub Subscription Misconfigured
**Symptom:** Watch created successfully but no notifications received
**Cause:** Subscription pointing to wrong URL or wrong delivery type
**Fix:** Verify subscription settings in Google Cloud Console

### Issue #4: Webhook Not Processing Notifications
**Symptom:** Notifications sent but webhook doesn't create events
**Cause:** Webhook code errors, unable to decode Pub/Sub message
**Fix:** Add logging to webhook, check for errors

## Next Steps

1. **Get fresh logs showing OAuth callback execution:**
   ```bash
   vercel logs https://family-schedule-mvp.vercel.app | grep -A20 "oauth-callback"
   ```

2. **Find the new Gmail account ID:**
   - Go to /settings?tab=apps
   - Open browser dev tools → Network tab
   - Note the accountId from API responses

3. **Manually enable push notifications:**
   ```bash
   curl -X POST https://family-schedule-mvp.vercel.app/api/gmail-watch \
     -H "Content-Type: application/json" \
     -d '{"accountId": "ACCOUNT_ID_FROM_STEP_2"}'
   ```

4. **Monitor webhook for incoming notifications:**
   ```bash
   vercel logs https://family-schedule-mvp.vercel.app | grep "gmail-webhook"
   ```

5. **Send test email and watch logs:**
   - Subject: "Doctor Appointment Tomorrow"
   - Body: "Doctor appointment tomorrow at 2pm"
   - Watch logs for webhook activity within 30 seconds

## Files Modified

- `/app/api/auth/google/callback/route.ts` - Added auto-enable push notifications
- `/app/api/gmail-watch/route.ts` - Fixed OAuth client initialization
- `/app/api/cron/renew-gmail-watches/route.ts` - Created cron job for watch renewal
- `/app/review/page.tsx` - Added manual "Check for New Emails" button
- `/vercel.json` - Added cron job schedule
- `/.env.local` - Added GOOGLE_PUBSUB_TOPIC locally

## Environment Variables Required

- `GOOGLE_CLIENT_ID` ✅
- `GOOGLE_CLIENT_SECRET` ✅
- `GOOGLE_PUBSUB_TOPIC` ✅
- `NEXT_PUBLIC_CONVEX_URL` ✅
- `OPENAI_API_KEY` ✅
- `CRON_SECRET` ✅

## Testing Checklist

- [ ] Disconnect Gmail account
- [ ] Clear browser cache (Ctrl+Shift+R)
- [ ] Reconnect Gmail account
- [ ] Check browser console for OAuth callback logs
- [ ] Check Vercel logs for push notification setup
- [ ] Get new account ID from database/settings
- [ ] Manually call `/api/gmail-watch` with new account ID
- [ ] Verify watch created successfully
- [ ] Send test email with keyword ("practice", "appointment", etc.)
- [ ] Wait 30 seconds
- [ ] Check `/review` page for event (without clicking button)
- [ ] Check Vercel logs for webhook activity
- [ ] Check Google Cloud Pub/Sub metrics for message delivery
