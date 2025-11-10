# Google Calendar Sync - Current Status

**Last Updated:** November 10, 2025
**Status:** 🟡 System Built & Deployed, OAuth Token Issue Blocking Sync

---

## Executive Summary

The two-way Google Calendar sync system is **fully implemented and deployed**, but sync is currently failing due to an **OAuth token permissions issue**. The existing token in production doesn't have Calendar access permissions.

**What's Working:**
- ✅ Sync code is complete and deployed
- ✅ Retry mechanism with exponential backoff is active
- ✅ Background cron job runs every 30 minutes
- ✅ Error handling and logging
- ✅ Token refresh logic
- ✅ Manual retry functions

**What's Not Working:**
- ❌ OAuth token lacks Calendar permissions (only has Gmail read permissions)
- ❌ Every sync attempt returns 401 "Invalid Credentials"
- ❌ Events stay in "failed" status and keep retrying

---

## The Problem

### Root Cause
The Gmail account connected to production (jdaws@artiosacademies.com) has an OAuth token that was created **before** the Calendar scope was added to the OAuth request.

**Current token has:**
- ✅ `https://www.googleapis.com/auth/gmail.readonly`
- ✅ `https://www.googleapis.com/auth/userinfo.email`
- ✅ `https://www.googleapis.com/auth/userinfo.profile`

**Token is missing:**
- ❌ `https://www.googleapis.com/auth/calendar`

### Evidence from Logs
```
[CALENDAR SYNC] Google Calendar API response status: 401
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials...",
    "status": "UNAUTHENTICATED"
  }
}
```

The token refresh succeeds (returns a valid access token), but that token doesn't have Calendar permissions, so Google Calendar API rejects it.

---

## The Solution

### Required Steps (Must be done in order)

#### 1. Revoke Current Access
**Why:** Google won't re-prompt for permissions if app already has access
**How:**
- Go to: https://myaccount.google.com/permissions
- Find "Our Daily Family" or your app name
- Click **"Remove Access"**

#### 2. Reconnect with Correct Account
**IMPORTANT:** Use **jdaws@artiosacademies.com** (NOT jedaws@gmail.com)

**Why:** Each email = separate Clerk account = separate family
- jedaws@gmail.com = new account, sent to onboarding
- jdaws@artiosacademies.com = your existing account with all events

**How:**
- Log in to: https://family-schedule-mvp.vercel.app/
- Use jdaws@artiosacademies.com
- Go to Settings → Apps tab

#### 3. Disconnect & Reconnect Gmail
**How:**
- Click **"Disconnect Gmail"** (if shown)
- Click **"Connect Gmail Account"**
- Sign in with jdaws@artiosacademies.com
- **CRITICAL:** When Google shows the permissions screen, verify you see:
  ```
  This app would like to:
  ☑ See and download your email messages
  ☑ See, edit, share, and permanently delete all the calendars you can access using Google Calendar
  ```
- Click **"Allow"**

#### 4. Re-select Calendar
**How:**
- After connecting, click **"Show My Calendars"**
- Select **"Family Schedule"**

#### 5. Test Sync
**Create a test event:**
- Title: "Test Sync"
- Date: Any future date
- Time: Any time
- Click Save

**Expected result:** Event appears in Google Calendar within 5-10 seconds

---

## What We've Built

### 1. Automatic Retry System
**File:** `convex/calendarSync.ts`

**Features:**
- Exponential backoff: 1min → 5min → 15min → 1hr → 4hr
- Max 5 retry attempts per event
- Automatic scheduling after failures
- Detailed error logging

**How it works:**
1. Event created → Immediate sync attempt
2. If fails → Schedule retry #1 in 1 minute
3. If fails → Schedule retry #2 in 5 minutes
4. If fails → Schedule retry #3 in 15 minutes
5. If fails → Schedule retry #4 in 1 hour
6. If fails → Schedule retry #5 in 4 hours
7. If still fails → Mark as permanently failed

### 2. Background Cron Job
**File:** `convex/crons.ts`

**Schedule:** Every 30 minutes
**Purpose:** Safety net to catch missed syncs

**What it does:**
- Queries all events with `syncStatus: "pending"` or `"failed"`
- Checks if enough time has passed since last attempt
- Skips events that exceeded max retries
- Schedules fresh sync attempts

### 3. Sync Status Tracking
**File:** `convex/schema.ts`

**New fields added to events table:**
```typescript
syncStatus: "pending" | "syncing" | "synced" | "failed"
syncError: string (error message from last failed attempt)
lastSyncAttempt: number (timestamp)
syncRetryCount: number (0-5)
```

**Indexed for efficient queries:**
- `by_sync_status`
- `by_family_and_sync_status`

### 4. Manual Retry Functions
**File:** `convex/calendarSync.ts`

**Available functions:**

#### Retry Single Event
```typescript
retrySyncForEvent(eventId)
```
- Resets retry count to 0
- Sets status to "pending"
- Schedules immediate sync

#### Retry All Family Events
```typescript
retrySyncForFamily(familyId)
```
- Finds all unsynced events
- Resets retry counts
- Schedules immediate sync for each
- Returns count of events scheduled

### 5. Query Unsynced Events
```typescript
getUnsyncedEvents(familyId)
```
- Returns all events with status "pending" or "failed"
- Useful for building UI to show sync status

---

## Current Production State

### Environment Variables
**Vercel Production:**
- ✅ `CONVEX_DEPLOYMENT=prod:modest-ram-699`
- ✅ `NEXT_PUBLIC_CONVEX_URL=https://modest-ram-699.convex.cloud`
- ✅ `GOOGLE_CLIENT_ID` (set)
- ✅ `GOOGLE_CLIENT_SECRET` (set)

**Convex Production:**
- ✅ `GOOGLE_CLIENT_ID` (set)
- ✅ `GOOGLE_CLIENT_SECRET` (set)

### Deployment Status
- ✅ Latest code deployed to Vercel
- ✅ Latest functions deployed to Convex
- ✅ Cron job registered and running
- ✅ Database schema updated with indexes

### Event Status
**All existing events are stuck with:**
- `syncStatus: "failed"`
- `syncError: "Google Calendar API returned 401: ..."`
- `syncRetryCount: 5` (max retries exceeded)

**These events will sync once OAuth token is fixed**

---

## Testing the Fix

### Once OAuth Token is Fixed

#### Test 1: New Event Sync
1. Create event: "Test Event 1"
2. Check Google Calendar within 10 seconds
3. ✅ Should appear automatically

#### Test 2: Existing Events Sync
**Option A:** Wait 30 minutes for cron job to pick them up
**Option B:** Manually trigger retry:
- Open browser console
- Run: `await convex.mutation(api.calendarSync.retrySyncForFamily, { familyId: "your-family-id" })`
- All failed events should sync within 10 seconds

#### Test 3: Verify Retry System
1. Temporarily disconnect Gmail
2. Create event
3. Event should fail and show status "failed"
4. Wait 1 minute
5. Reconnect Gmail
6. Event should auto-retry and sync successfully

---

## Monitoring & Debugging

### Check Sync Status (Convex Dashboard)

**Production logs:**
```bash
npx convex logs --prod
```

**Look for:**
- ✅ `[Token Refresh] Successfully refreshed access token`
- ✅ `[CALENDAR SYNC] Event created in Google Calendar with ID:`
- ✅ `[CALENDAR SYNC] Successfully synced event`
- ❌ `[Token Refresh] Failed to refresh access token`
- ❌ `401` or `Invalid Credentials`

### Check Cron Job

**Convex Dashboard → Crons:**
- Look for "retry-failed-calendar-syncs"
- Verify it's running every 30 minutes
- Check last run timestamp

### Check Event Sync Status (Database)

Query events in Convex dashboard:
```javascript
// Find unsynced events
db.query("events")
  .withIndex("by_sync_status", q => q.eq("syncStatus", "failed"))
  .collect()

// Check specific event
db.get(eventId)
// Look at: syncStatus, syncError, syncRetryCount, lastSyncAttempt
```

---

## Common Issues & Solutions

### Issue: "Token refresh succeeded but still getting 401"
**Cause:** Token doesn't have Calendar scope
**Solution:** Revoke and reconnect Gmail per steps above

### Issue: "Events not retrying after 1 minute"
**Cause:** Max retries exceeded (5 attempts)
**Solution:** Manually trigger retry with `retrySyncForFamily`

### Issue: "Redirected to onboarding after Gmail connect"
**Cause:** Signed in with wrong email (jedaws@gmail.com instead of jdaws@artiosacademies.com)
**Solution:** Sign out and sign back in with correct email

### Issue: "No events syncing at all"
**Cause:** Multiple possible causes:
1. OAuth token missing Calendar scope (most likely)
2. Gmail account disconnected
3. No calendar selected
4. Environment variables not set

**Debug:**
1. Check production logs for specific error
2. Verify Gmail connected in Settings
3. Verify calendar selected
4. Check Convex env vars: `npx convex env list --prod`

---

## Architecture Diagram

```
User Creates Event
       ↓
[events.createEvent mutation]
       ↓
Set syncStatus="pending"
       ↓
[Scheduler] runAfter(0ms)
       ↓
[calendarSync.syncEventToGoogleCalendar]
       ↓
Check retry count < 5?
   ↓ No → Mark failed, stop
   ↓ Yes
       ↓
Get Gmail account OAuth tokens
       ↓
Refresh access token
       ↓ Success
       ↓
Call Google Calendar API
       ↓
   ↙       ↘
Success    Fail
   ↓         ↓
Mark      Increment retry count
"synced"  Set syncStatus="failed"
          Schedule retry with backoff


[Background Cron - Every 30 min]
       ↓
Query all pending/failed events
       ↓
For each event (retry < 5):
   Schedule sync attempt
```

---

## Files Changed

| File | Changes | Purpose |
|------|---------|---------|
| `convex/schema.ts` | Added sync status fields & indexes | Track sync state per event |
| `convex/events.ts` | Initialize syncStatus on create | Set events to "pending" |
| `convex/calendarSync.ts` | Retry logic, manual sync functions | Core sync functionality |
| `convex/crons.ts` | Background sync job | Safety net for missed syncs |
| `app/api/create-google-calendar/route.ts` | Token refresh error handling | Better error messages |

---

## Next Steps

### Immediate (To Fix Sync)
1. ⏳ **User action required:** Revoke and reconnect Gmail with Calendar permissions
2. ✅ Test sync with new event
3. ✅ Manually trigger retry for existing failed events

### Future Enhancements (Optional)

#### UI Improvements
- [ ] Show sync status badges on event cards
- [ ] Add "Retry Sync" button for failed events
- [ ] Add family-wide "Retry All" button
- [ ] Show sync error messages in UI

#### Admin Features
- [ ] Sync health dashboard
- [ ] Alerts for persistent failures
- [ ] Bulk retry operations

#### Improvements
- [ ] Reduce max retries to 3 (currently 5)
- [ ] Add exponential backoff cap (currently 4 hours)
- [ ] Add manual "Force Sync" that bypasses retry limit

---

## Success Criteria

✅ **System is working when:**
1. New events appear in Google Calendar within 10 seconds
2. No 401 errors in production logs
3. All events show `syncStatus: "synced"`
4. Cron job runs successfully every 30 minutes
5. Manual retry functions work correctly

---

## Support & Documentation

**Additional Documentation:**
- `SYNC_RETRY_IMPLEMENTATION.md` - Full technical implementation details
- `CHANGES_SUMMARY.md` - Quick summary of changes
- `QUICK_REFERENCE.md` - Quick reference guide
- `GOOGLE_CALENDAR_SYNC_SETUP.md` - Original setup guide

**Need Help?**
1. Check production logs: `npx convex logs --prod`
2. Review this document for common issues
3. Check Convex dashboard for event sync status
4. Verify environment variables are set correctly

---

**Status Last Verified:** November 10, 2025, 9:15 PM EST
**System Version:** v1.0 with automatic retry
**Next Review:** After OAuth token is fixed and sync is verified working
