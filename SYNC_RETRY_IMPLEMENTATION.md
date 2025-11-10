# Google Calendar Sync Retry & Failsafe Implementation

## Overview
This document describes the comprehensive retry and failsafe system for Google Calendar sync that ensures events eventually sync even if initial attempts fail due to OAuth token issues, network problems, or other transient failures.

## Architecture

### 1. Sync Status Tracking (Schema Changes)

**File: `convex/schema.ts`**

Added the following fields to the `events` table:
- `syncStatus`: "pending" | "syncing" | "synced" | "failed"
- `syncError`: Optional string containing error message from last failed attempt
- `lastSyncAttempt`: Optional timestamp of last sync attempt
- `syncRetryCount`: Optional number tracking retry attempts (max 5)

Added indexes:
- `by_sync_status`: For querying events by sync status
- `by_family_and_sync_status`: For querying unsynced events per family

### 2. Event Creation Updates

**File: `convex/events.ts`**

All event creation functions now initialize:
```typescript
syncStatus: "pending",
syncRetryCount: 0,
```

Functions updated:
- `createEvent`: Sets initial syncStatus to "pending"
- `createUnconfirmedEvent`: Sets initial syncStatus to "pending"
- `createConfirmedEventFromCalendar`: Sets syncStatus to "synced" (already in Google Calendar)

The `updateEvent` mutation now accepts sync status fields to allow the sync system to update event status.

### 3. Retry Logic with Exponential Backoff

**File: `convex/calendarSync.ts`**

#### Retry Schedule (Exponential Backoff):
1. **Attempt 1**: Immediate (on event creation/confirmation)
2. **Retry 1**: After 1 minute
3. **Retry 2**: After 5 minutes
4. **Retry 3**: After 15 minutes
5. **Retry 4**: After 1 hour
6. **Retry 5**: After 4 hours
7. **Max retries exceeded**: Event marked as "failed" with message for manual intervention

#### `syncEventToGoogleCalendar` Updates:
- Accepts `isRetry` parameter to track retry attempts
- Checks `syncRetryCount` and rejects if >= 5 attempts
- Updates `syncStatus` to "syncing" before attempting sync
- On **success**:
  - Sets `syncStatus` to "synced"
  - Clears `syncError`
  - Resets `syncRetryCount` to 0
  - Updates `lastSyncedAt`
- On **failure**:
  - Sets `syncStatus` to "failed"
  - Records error in `syncError`
  - Increments `syncRetryCount`
  - Updates `lastSyncAttempt`
  - Schedules retry with exponential backoff (if retries remaining)

#### Error Handling:
- **No Gmail account**: Schedules retry (account might be connected later)
- **API errors (401, 403, 500, etc.)**: Schedules retry
- **Token refresh failures**: Schedules retry
- **Network errors**: Schedules retry
- **Max retries exceeded**: Marks as permanently failed

### 4. Background Sync Cron Job

**File: `convex/crons.ts`**

New cron job added:
```typescript
crons.interval(
  "retry-failed-calendar-syncs",
  { minutes: 30 },
  internal.calendarSync.backgroundSyncRetry
);
```

#### `backgroundSyncRetry` Logic:
- Runs every 30 minutes
- Queries all events with `syncStatus` = "pending" or "failed"
- Filters for confirmed events only
- Skips events that:
  - Have exceeded max retries (5)
  - Haven't waited long enough since last attempt (respects exponential backoff)
- Schedules immediate retry for eligible events
- Logs comprehensive metrics (total unsynced, scheduled for retry)

**Why 30 minutes?**
- Catches events that fell through scheduled retries
- Provides safety net for edge cases
- Doesn't hammer the API (rate limit friendly)
- Fast enough to catch most issues within a reasonable timeframe

### 5. Manual Sync Functions

**File: `convex/calendarSync.ts`**

#### Query Functions:
- **`getUnsyncedEvents(familyId)`**: Returns all pending/failed events for a family
- **`getAllUnsyncedEvents()`**: Internal query for cron job to get all unsynced events

#### Manual Retry Functions:
- **`retrySyncForEvent(eventId)`**:
  - Resets single event to "pending"
  - Resets retry count to 0
  - Schedules immediate sync
  - Returns success message

- **`retrySyncForFamily(familyId)`**:
  - Finds all unsynced events for family
  - Resets all to "pending" with retry count 0
  - Schedules immediate sync for each
  - Returns count of events scheduled
  - **Use case**: User fixes OAuth, wants to sync all pending events

## Usage Guide

### For Frontend/UI Developers

#### 1. Display Sync Status to Users
```typescript
// Query unsynced events
const unsyncedEvents = useQuery(api.calendarSync.getUnsyncedEvents, {
  familyId: family._id
});

// Show badge/indicator if events are unsynced
{unsyncedEvents && unsyncedEvents.length > 0 && (
  <Badge variant="warning">
    {unsyncedEvents.length} events pending sync
  </Badge>
)}
```

#### 2. Manual Retry Button (Single Event)
```typescript
const retrySyncEvent = useMutation(api.calendarSync.retrySyncForEvent);

const handleRetry = async (eventId) => {
  try {
    const result = await retrySyncEvent({ eventId });
    toast.success(result.message);
  } catch (error) {
    toast.error(`Retry failed: ${error.message}`);
  }
};
```

#### 3. Manual Retry Button (All Family Events)
```typescript
const retrySyncFamily = useMutation(api.calendarSync.retrySyncForFamily);

const handleRetryAll = async () => {
  try {
    const result = await retrySyncFamily({ familyId: family._id });
    toast.success(`Syncing ${result.eventCount} events`);
  } catch (error) {
    toast.error(`Retry failed: ${error.message}`);
  }
};
```

#### 4. Display Event Sync Status
```typescript
// In event list/card component
{event.syncStatus === "failed" && (
  <div className="text-red-500">
    <AlertCircle className="h-4 w-4" />
    Sync failed: {event.syncError}
    <button onClick={() => handleRetry(event._id)}>
      Retry Sync
    </button>
  </div>
)}

{event.syncStatus === "pending" && (
  <div className="text-yellow-500">
    <Clock className="h-4 w-4" />
    Sync pending...
  </div>
)}

{event.syncStatus === "syncing" && (
  <div className="text-blue-500">
    <Loader className="h-4 w-4 animate-spin" />
    Syncing...
  </div>
)}

{event.syncStatus === "synced" && (
  <div className="text-green-500">
    <CheckCircle className="h-4 w-4" />
    Synced
  </div>
)}
```

### For Backend/Admin

#### Monitor Sync Health
```typescript
// Query all unsynced events (for dashboard)
const unsyncedEvents = await ctx.runQuery(
  internal.calendarSync.getAllUnsyncedEvents
);

// Group by error type
const errorsByType = unsyncedEvents.reduce((acc, event) => {
  const error = event.syncError || "Unknown";
  acc[error] = (acc[error] || 0) + 1;
  return acc;
}, {});
```

#### Manually Trigger Background Sync
```typescript
// If you need to run background sync immediately
await ctx.runAction(internal.calendarSync.backgroundSyncRetry);
```

## Migration Notes

### Existing Events
Events created before this implementation will have:
- `syncStatus`: `undefined`
- `syncRetryCount`: `undefined`

The system treats `undefined` syncStatus as:
- "synced" if event has `googleCalendarEventId`
- "pending" otherwise

To migrate existing events, run:
```typescript
// Migration script (run once)
const events = await ctx.db.query("events").collect();
for (const event of events) {
  if (event.syncStatus === undefined) {
    await ctx.db.patch(event._id, {
      syncStatus: event.googleCalendarEventId ? "synced" : "pending",
      syncRetryCount: 0,
    });
  }
}
```

## Testing Recommendations

### 1. Test Sync Failures
```typescript
// Temporarily disconnect Gmail account
// Create event
// Verify it's marked as "failed"
// Verify retry is scheduled
// Reconnect Gmail account
// Wait for background sync or manual retry
// Verify event syncs successfully
```

### 2. Test Exponential Backoff
```typescript
// Mock Google Calendar API to always return 500
// Create event
// Verify retries happen at: 1min, 5min, 15min, 1hr, 4hr
// Verify max retries stops at 5
```

### 3. Test Background Sync
```typescript
// Create multiple failed events
// Wait 30 minutes
// Verify background sync picks them up
// Verify successful events are marked as "synced"
```

### 4. Test Manual Retry
```typescript
// Create event with max retries exceeded
// Call retrySyncForEvent
// Verify retry count resets to 0
// Verify event syncs successfully
```

### 5. Test Cron Job
```typescript
// Check Convex dashboard for cron job execution
// Verify "retry-failed-calendar-syncs" runs every 30 minutes
// Check logs for "[BACKGROUND SYNC]" messages
```

## Monitoring & Alerts

### Key Metrics to Track:
1. **Unsynced event count**: Events with status "pending" or "failed"
2. **Retry success rate**: Events that succeed after retries vs. max retries exceeded
3. **Average time to sync**: From creation to "synced" status
4. **Common error types**: Group by `syncError` to identify systemic issues

### Recommended Alerts:
- Alert if > 10 events stuck in "failed" status for > 24 hours
- Alert if sync success rate drops below 95%
- Alert if background sync job fails

## Security Considerations

1. **Token Security**: Refresh tokens are stored securely and never exposed to client
2. **Rate Limiting**: 30-minute cron + exponential backoff prevents API abuse
3. **User Privacy**: Sync errors don't expose sensitive data in error messages
4. **Audit Trail**: All sync attempts logged with timestamps

## Performance Considerations

1. **Database Indexes**: Added indexes on `syncStatus` for efficient queries
2. **Batch Operations**: Background sync processes events in batches
3. **Scheduling**: Uses Convex scheduler (not immediate execution) to avoid blocking
4. **Exponential Backoff**: Reduces load on Google Calendar API during outages

## Future Enhancements

1. **Webhook Integration**: Real-time sync status updates via webhooks
2. **Bulk Operations**: Batch create/update to reduce API calls
3. **Smart Retry**: Adjust retry schedule based on error type (401 vs 500)
4. **User Notifications**: Email/SMS when sync fails after max retries
5. **Sync History**: Track all sync attempts for debugging
6. **Metrics Dashboard**: Visual dashboard showing sync health

## Troubleshooting

### Events Not Syncing?
1. Check `syncStatus` and `syncError` fields
2. Verify Gmail account is connected and active
3. Check Google Calendar API quota/limits
4. Verify OAuth tokens are valid
5. Check Convex function logs for errors

### Background Sync Not Running?
1. Verify cron job is registered in Convex dashboard
2. Check cron job execution logs
3. Verify no deployment issues

### Max Retries Exceeded?
1. Check `syncError` for root cause
2. Fix underlying issue (e.g., reconnect Gmail)
3. Use `retrySyncForFamily` to retry all failed events

## Summary

This implementation provides:
- **Reliability**: Automatic retries with exponential backoff
- **Visibility**: Clear sync status on every event
- **Recoverability**: Manual retry functions for users and admins
- **Robustness**: Background sync catches edge cases
- **Observability**: Comprehensive logging for debugging
- **User Experience**: Events eventually sync without user intervention

The system ensures that events created in the app database will eventually sync to Google Calendar, even in the face of transient failures like OAuth token expiration, network issues, or API downtime.
