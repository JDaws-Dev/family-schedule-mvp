# Google Calendar Sync - Quick Reference

## Quick Start Checklist

- [ ] Google OAuth credentials configured in `.env.local`
- [ ] User connected Gmail account in app
- [ ] User selected Google Calendar in settings
- [ ] (Optional) Webhook set up for real-time sync

## How Sync Works

### App → Google Calendar
```
Create event → Auto-syncs in ~3 seconds
Update event → Auto-syncs in ~3 seconds
Delete event → Auto-syncs in ~3 seconds
```

### Google Calendar → App
```
With webhooks: Auto-syncs in ~5 seconds
Without webhooks: Manual sync button
```

## Key Files

| File | Purpose |
|------|---------|
| `convex/calendarSync.ts` | Sync logic (create, update, delete) |
| `convex/events.ts` | Event mutations that trigger sync |
| `app/api/sync-from-calendar/route.ts` | Pull events from Google Calendar |
| `app/api/calendar-webhook/route.ts` | Receive Google notifications |
| `app/components/SyncStatus.tsx` | UI sync status display |

## Environment Variables

```bash
# Required (already set)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Update for production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Key Schema Fields

**events table**:
- `googleCalendarEventId`: Links to Google Calendar
- `lastSyncedAt`: Last sync timestamp

**families table**:
- `googleCalendarId`: Which calendar to sync with
- `lastCalendarSyncAt`: Last sync time

## Common Commands

### Manual Sync
```bash
curl -X POST http://localhost:3000/api/sync-from-calendar \
  -H "Content-Type: application/json" \
  -d '{"familyId": "k1..."}'
```

### Setup Webhook
```bash
curl -X POST http://localhost:3000/api/setup-calendar-watch \
  -H "Content-Type: application/json" \
  -d '{"familyId": "k1..."}'
```

## Troubleshooting

### Event not syncing to Google Calendar?
1. Check if `googleCalendarId` is set for family
2. Verify Gmail account is connected
3. Check server logs for errors
4. Ensure event is confirmed (`isConfirmed: true`)

### Event not syncing from Google Calendar?
1. Check if webhook is set up (or use manual sync)
2. Verify correct calendar is selected
3. Check for OAuth token errors in logs

### Seeing duplicates?
1. Check `googleCalendarEventId` is being saved
2. Verify only one webhook is registered
3. Review conflict resolution logs

## Log Patterns

### Successful sync TO Google Calendar:
```
[CALENDAR SYNC] Successfully synced event k1... to Google Calendar with ID abc123
```

### Successful sync FROM Google Calendar:
```
[sync-from-calendar] Sync complete: 1 added, 0 updated, 0 deleted
```

### Conflict detected:
```
[sync-from-calendar] Skipping update (our version is newer)
```

## Quick Tests

### Test 1: Create in app
1. Create event in app
2. Wait 5 seconds
3. Check Google Calendar ✓

### Test 2: Create in Google Calendar
1. Create event in Google Calendar
2. Click "Sync Now" (or wait for webhook)
3. Check app ✓

### Test 3: Update in app
1. Edit event in app
2. Wait 5 seconds
3. Check Google Calendar for changes ✓

## Performance Targets

- ✅ Sync speed: < 5 seconds
- ✅ Success rate: > 99%
- ✅ No duplicate events
- ✅ No infinite loops

## Need More Help?

- **Setup**: See `GOOGLE_CALENDAR_SYNC_SETUP.md`
- **Testing**: See `TESTING_GUIDE.md`
- **Architecture**: See `SYNC_IMPLEMENTATION_SUMMARY.md`

## Status Check

Run these queries in Convex dashboard:

```javascript
// Check sync status for a family
api.syncStatus.getSyncStatus({ familyId: "k1..." })

// Check events with Google Calendar IDs
db.query("events")
  .filter(q => q.neq(q.field("googleCalendarEventId"), undefined))
  .collect()

// Check webhook configuration
db.query("families")
  .filter(q => q.neq(q.field("calendarWebhookChannelId"), undefined))
  .collect()
```

## Contact

For issues or questions, check the detailed documentation files or review Convex function logs.
