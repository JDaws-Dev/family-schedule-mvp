# Changes Summary - Sync Retry Implementation

## Files Modified

### 1. `/convex/schema.ts`
**Changes:**
- Added sync status tracking fields to `events` table:
  - `syncStatus`: "pending" | "syncing" | "synced" | "failed"
  - `syncError`: Error message from last sync attempt
  - `lastSyncAttempt`: Timestamp of last sync attempt
  - `syncRetryCount`: Number of retry attempts
- Added indexes:
  - `by_sync_status`: For querying by sync status
  - `by_family_and_sync_status`: For querying unsynced events per family

**Impact:** Existing events will have `undefined` for new fields (backward compatible)

---

### 2. `/convex/events.ts`
**Changes:**
- `createEvent`: Initialize `syncStatus: "pending"`, `syncRetryCount: 0`
- `createUnconfirmedEvent`: Initialize `syncStatus: "pending"`, `syncRetryCount: 0`
- `createConfirmedEventFromCalendar`: Initialize `syncStatus: "synced"`, `syncRetryCount: 0`
- `updateEvent`: Added sync status fields to args and excluded them from triggering calendar updates

**Impact:** All new events track sync status from creation

---

### 3. `/convex/calendarSync.ts`
**Major Changes:**

#### New Helper Function:
- `getRetryDelay(retryCount)`: Returns delay for exponential backoff
  - Retry 1: 1 minute
  - Retry 2: 5 minutes
  - Retry 3: 15 minutes
  - Retry 4: 1 hour
  - Retry 5: 4 hours

#### Modified `syncEventToGoogleCalendar`:
- Added `isRetry` parameter
- Checks max retries (5) and rejects if exceeded
- Updates `syncStatus` to "syncing" before attempt
- On success: Sets "synced", clears error, resets retry count
- On failure: Sets "failed", logs error, increments retry count, schedules retry
- Handles all error types: no Gmail account, API errors, token failures, network errors

#### New Query Functions:
- `getUnsyncedEvents(familyId)`: Returns unsynced events for a family
- `getAllUnsyncedEvents()`: Internal query for cron job

#### New Mutation Functions:
- `retrySyncForEvent(eventId)`: Manual retry for single event
- `retrySyncForFamily(familyId)`: Manual retry for all family events

#### New Internal Action:
- `backgroundSyncRetry()`: Cron job handler for background sync

**Impact:** Complete retry logic with exponential backoff and manual intervention

---

### 4. `/convex/crons.ts`
**Changes:**
- Added new cron job:
  ```typescript
  crons.interval(
    "retry-failed-calendar-syncs",
    { minutes: 30 },
    internal.calendarSync.backgroundSyncRetry
  );
  ```

**Impact:** Automatic background retry every 30 minutes

---

## How It Works

### Flow for New Event:
1. Event created with `syncStatus: "pending"`
2. Sync scheduled immediately
3. Sync attempts:
   - Success → `syncStatus: "synced"` ✓
   - Failure → `syncStatus: "failed"`, retry scheduled
4. Retries happen at: 1min, 5min, 15min, 1hr, 4hr
5. If all retries fail → marked "failed" for manual intervention
6. Background cron catches any missed events every 30 minutes

### Manual Retry:
- User/Admin calls `retrySyncForFamily(familyId)`
- All failed events reset to "pending"
- Immediate sync scheduled
- Fresh retry attempts (count reset to 0)

---

## Testing Checklist

- [ ] Create event → verify it syncs
- [ ] Disconnect Gmail → create event → verify retry scheduled
- [ ] Reconnect Gmail → verify event syncs on retry
- [ ] Wait 30 minutes → verify background sync runs
- [ ] Call `retrySyncForFamily` → verify all events retry
- [ ] Check Convex logs for "[CALENDAR SYNC]" messages
- [ ] Check Convex dashboard for cron job execution

---

## API Usage Examples

### Query Unsynced Events:
```typescript
const unsyncedEvents = useQuery(api.calendarSync.getUnsyncedEvents, {
  familyId: family._id
});
```

### Retry Single Event:
```typescript
const retry = useMutation(api.calendarSync.retrySyncForEvent);
await retry({ eventId: event._id });
```

### Retry All Family Events:
```typescript
const retryAll = useMutation(api.calendarSync.retrySyncForFamily);
const result = await retryAll({ familyId: family._id });
console.log(`Syncing ${result.eventCount} events`);
```

---

## Deployment Notes

1. **Schema changes are backward compatible** - existing events continue to work
2. **Cron job registers automatically** - no manual setup needed
3. **No frontend changes required** - sync happens automatically
4. **Optional: Add UI indicators** - show sync status to users
5. **Optional: Migration script** - update existing events with sync status

---

## Monitoring

Check Convex Dashboard for:
- Cron job "retry-failed-calendar-syncs" running every 30 minutes
- Function logs with "[BACKGROUND SYNC]" prefix
- Event count metrics in logs

Check Event Database for:
- Events with `syncStatus: "failed"` - indicates persistent issues
- Events with `syncRetryCount >= 5` - exceeded max retries
- Events with `syncStatus: "pending"` for > 1 hour - slow sync

---

## Rollback Plan

If issues arise:
1. Disable cron job in Convex dashboard
2. Schema changes are non-breaking (optional fields)
3. Revert code changes to previous version
4. Events will continue to sync on creation (without retry logic)
