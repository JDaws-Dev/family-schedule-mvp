# Quick Reference - Sync Retry System

## Event Sync Status Flow

```
Event Created
    ↓
syncStatus: "pending"
syncRetryCount: 0
    ↓
Sync Attempt
    ↓
[Success] → syncStatus: "synced" ✓
    ↓
[Failure] → syncStatus: "failed"
            syncRetryCount++
            Schedule retry
    ↓
Retry after delay (1min → 5min → 15min → 1hr → 4hr)
    ↓
[Success after retry] → syncStatus: "synced" ✓
    ↓
[Max retries (5) exceeded] → syncStatus: "failed"
                             Manual intervention needed
```

## Retry Schedule

| Attempt | Delay | Total Time |
|---------|-------|------------|
| Initial | Immediate | 0s |
| Retry 1 | 1 minute | 1min |
| Retry 2 | 5 minutes | 6min |
| Retry 3 | 15 minutes | 21min |
| Retry 4 | 1 hour | 1hr 21min |
| Retry 5 | 4 hours | 5hr 21min |
| Failed | Manual | ∞ |

## Sync Status Values

| Status | Meaning | Action Needed |
|--------|---------|---------------|
| `pending` | Not yet synced, waiting | None - will auto-sync |
| `syncing` | Currently syncing | None - in progress |
| `synced` | Successfully synced | None - complete |
| `failed` | Sync failed, retrying | Check error, may need manual retry |

## API Quick Reference

### Query Functions

```typescript
// Get unsynced events for a family
const unsyncedEvents = useQuery(api.calendarSync.getUnsyncedEvents, {
  familyId: family._id
});

// Returns array of events with:
// - event.syncStatus: "pending" | "failed"
// - event.syncError: string (error message)
// - event.syncRetryCount: number (0-5)
// - event.lastSyncAttempt: number (timestamp)
```

### Mutation Functions

```typescript
// Retry single event
const retrySyncEvent = useMutation(api.calendarSync.retrySyncForEvent);
const result = await retrySyncEvent({ eventId: event._id });
// Returns: { success: true, message: "Sync scheduled for event" }

// Retry all family events
const retrySyncFamily = useMutation(api.calendarSync.retrySyncForFamily);
const result = await retrySyncFamily({ familyId: family._id });
// Returns: { success: true, message: "...", eventCount: 5 }
```

## Common Scenarios

### Scenario 1: OAuth Token Expired
**Symptoms:**
- Events created but not appearing in Google Calendar
- `syncError`: "Token refresh failed: invalid_grant"

**Solution:**
1. User reconnects Gmail account
2. Call `retrySyncForFamily(familyId)`
3. All pending events will sync

### Scenario 2: Network Failure
**Symptoms:**
- Events stuck in "pending" or "failed"
- `syncError`: "Network error" or timeout

**Solution:**
- Wait for automatic retry (happens automatically)
- Or call `retrySyncForFamily(familyId)` to force immediate retry

### Scenario 3: Max Retries Exceeded
**Symptoms:**
- Event has `syncRetryCount: 5`
- `syncStatus: "failed"`
- `syncError`: "Maximum retry attempts (5) exceeded"

**Solution:**
1. Fix underlying issue (reconnect account, check quotas, etc.)
2. Call `retrySyncForEvent(eventId)` or `retrySyncForFamily(familyId)`
3. Retry count resets to 0, fresh attempts begin

### Scenario 4: No Google Calendar Configured
**Symptoms:**
- Events marked as `syncStatus: "synced"`
- But `googleCalendarEventId` is empty

**Explanation:**
- This is expected behavior
- Events are marked "synced" because there's no calendar to sync to
- Once user connects calendar, they can manually trigger sync

## UI Component Examples

### Event Status Badge
```tsx
function EventSyncBadge({ event }) {
  if (!event.syncStatus || event.syncStatus === "synced") {
    return <Badge variant="success">Synced</Badge>;
  }

  if (event.syncStatus === "syncing") {
    return <Badge variant="info">Syncing...</Badge>;
  }

  if (event.syncStatus === "pending") {
    return <Badge variant="warning">Pending</Badge>;
  }

  if (event.syncStatus === "failed") {
    return (
      <Badge variant="error">
        Failed (Retry {event.syncRetryCount || 0}/5)
      </Badge>
    );
  }
}
```

### Retry Button
```tsx
function RetryButton({ eventId }) {
  const retrySyncEvent = useMutation(api.calendarSync.retrySyncForEvent);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const result = await retrySyncEvent({ eventId });
      toast.success(result.message);
    } catch (error) {
      toast.error(`Retry failed: ${error.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <button onClick={handleRetry} disabled={isRetrying}>
      {isRetrying ? "Retrying..." : "Retry Sync"}
    </button>
  );
}
```

### Family-Wide Retry Banner
```tsx
function SyncStatusBanner({ familyId }) {
  const unsyncedEvents = useQuery(api.calendarSync.getUnsyncedEvents, {
    familyId
  });
  const retrySyncFamily = useMutation(api.calendarSync.retrySyncForFamily);

  if (!unsyncedEvents || unsyncedEvents.length === 0) {
    return null;
  }

  const handleRetryAll = async () => {
    const result = await retrySyncFamily({ familyId });
    toast.success(`Syncing ${result.eventCount} events`);
  };

  return (
    <Alert variant="warning">
      {unsyncedEvents.length} events pending sync to Google Calendar.
      <button onClick={handleRetryAll}>Retry All</button>
    </Alert>
  );
}
```

## Monitoring Queries

### Admin Dashboard: Sync Health
```typescript
// Get all unsynced events (admin only)
const unsyncedEvents = await ctx.runQuery(
  internal.calendarSync.getAllUnsyncedEvents
);

// Group by status
const pending = unsyncedEvents.filter(e => e.syncStatus === "pending");
const failed = unsyncedEvents.filter(e => e.syncStatus === "failed");
const maxRetriesExceeded = failed.filter(e => e.syncRetryCount >= 5);

console.log({
  total: unsyncedEvents.length,
  pending: pending.length,
  failed: failed.length,
  needsIntervention: maxRetriesExceeded.length
});
```

### Group Errors by Type
```typescript
const errorsByType = unsyncedEvents.reduce((acc, event) => {
  const errorType = event.syncError?.split(':')[0] || "Unknown";
  acc[errorType] = (acc[errorType] || 0) + 1;
  return acc;
}, {});

// Example output:
// {
//   "Token refresh failed": 5,
//   "Google Calendar API returned 500": 2,
//   "No Gmail account connected": 1
// }
```

## Cron Job Status

### Check Cron Job Execution
1. Go to Convex Dashboard
2. Navigate to "Crons" tab
3. Look for "retry-failed-calendar-syncs"
4. Check:
   - Status: Running/Idle
   - Last run: Timestamp
   - Next run: Timestamp
   - Frequency: Every 30 minutes

### Read Cron Job Logs
1. Go to Convex Dashboard
2. Navigate to "Logs" tab
3. Filter for "[BACKGROUND SYNC]"
4. Look for:
   - "Starting background sync retry job"
   - "Found X unsynced events"
   - "Scheduled Y events for sync"

## Troubleshooting Commands

### Check Event Sync Status
```typescript
const event = await ctx.db.get(eventId);
console.log({
  syncStatus: event.syncStatus,
  syncError: event.syncError,
  retryCount: event.syncRetryCount,
  lastAttempt: new Date(event.lastSyncAttempt).toISOString()
});
```

### Force Immediate Sync
```typescript
// Reset and retry single event
await ctx.runMutation(api.calendarSync.retrySyncForEvent, {
  eventId: eventId
});

// Reset and retry all family events
await ctx.runMutation(api.calendarSync.retrySyncForFamily, {
  familyId: familyId
});
```

### Manually Trigger Background Sync
```typescript
// Run background sync immediately (don't wait 30 minutes)
await ctx.runAction(internal.calendarSync.backgroundSyncRetry);
```

## Error Messages Reference

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Token refresh failed: invalid_grant" | OAuth token expired/revoked | Reconnect Gmail account |
| "No Gmail account connected" | No active Gmail account | Connect Gmail account |
| "Google Calendar API returned 401" | Unauthorized | Check OAuth permissions |
| "Google Calendar API returned 403" | Forbidden | Check calendar access |
| "Google Calendar API returned 500" | Google server error | Wait and retry |
| "Maximum retry attempts (5) exceeded" | All retries failed | Fix root cause, manual retry |

## Performance Notes

- **Indexes**: Two new indexes added for efficient queries
  - `by_sync_status`: For cron job
  - `by_family_and_sync_status`: For user queries
- **Scheduling**: Uses Convex scheduler (non-blocking)
- **Batch Size**: Background sync processes all unsynced events
- **Rate Limiting**: 30-minute cron + exponential backoff prevents API abuse

## Security Notes

- OAuth tokens stored securely in database
- Sync errors sanitized (no token leaks)
- Only confirmed events are synced
- User can only retry their own family's events
