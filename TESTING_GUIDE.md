# Google Calendar Two-Way Sync Testing Guide

## Prerequisites

Before testing, ensure:
1. Gmail account is connected in the app
2. Google Calendar is selected in settings
3. At least one test event exists
4. Webhook is set up (optional, for real-time sync)

## Test Scenarios

### Test 1: Create Event in App → Syncs to Google Calendar

**Steps**:
1. Log into the app
2. Go to Dashboard or Calendar view
3. Click "Add Event" button
4. Fill in event details:
   - Title: "Test Event - App to GCal"
   - Date: Tomorrow's date
   - Time: 2:00 PM
   - Location: "Test Location"
   - Description: "Testing sync from app to Google Calendar"
5. Click "Save" or "Confirm"
6. Wait 5-10 seconds for background sync

**Expected Result**:
- Event appears in the app immediately
- Event appears in Google Calendar within 10 seconds
- All details match (title, date, time, location, description)
- Event has a `googleCalendarEventId` in the database
- Event has a `lastSyncedAt` timestamp

**How to Verify**:
```bash
# Check Convex logs
# Look for: "[CALENDAR SYNC] Successfully synced event..."

# Check Google Calendar
# Open Google Calendar in browser or mobile app
# Event should appear on tomorrow's date at 2:00 PM
```

---

### Test 2: Update Event in App → Updates in Google Calendar

**Steps**:
1. Find the event created in Test 1
2. Click to edit the event
3. Change the title to "Updated Test Event"
4. Change the time to 3:00 PM
5. Save changes
6. Wait 5-10 seconds

**Expected Result**:
- Updated event appears in the app immediately
- Google Calendar event updates within 10 seconds
- Both title and time are updated in Google Calendar
- `lastSyncedAt` timestamp is updated

**How to Verify**:
```bash
# Check Convex logs
# Look for: "[CALENDAR SYNC UPDATE] Successfully updated event..."

# Check Google Calendar
# Event should show new title and new time (3:00 PM)
```

---

### Test 3: Delete Event in App → Deletes from Google Calendar

**Steps**:
1. Find the event from Test 2
2. Click delete button
3. Confirm deletion
4. Wait 5-10 seconds

**Expected Result**:
- Event removed from app immediately
- Event removed from Google Calendar within 10 seconds

**How to Verify**:
```bash
# Check Convex logs
# Look for: "[CALENDAR SYNC DELETE] Successfully deleted event..."

# Check Google Calendar
# Event should no longer appear in calendar
```

---

### Test 4: Create Event in Google Calendar → Syncs to App

**Without Webhooks (Manual Sync)**:
1. Open Google Calendar in browser
2. Create a new event:
   - Title: "Test Event - GCal to App"
   - Date: Day after tomorrow
   - Time: 10:00 AM
   - Location: "Google Office"
3. Save the event
4. Go back to the app
5. Click "Sync Now" button (if available) or navigate to `/api/sync-from-calendar`

**With Webhooks (Real-time)**:
1. Open Google Calendar in browser
2. Create a new event (same details as above)
3. Save the event
4. Wait 5-10 seconds
5. Refresh the app

**Expected Result**:
- Event appears in the app
- Event is marked as confirmed
- All details match Google Calendar
- Event has a `googleCalendarEventId`
- Event has a `lastSyncedAt` timestamp

**How to Verify**:
```bash
# Check Convex logs
# Look for: "[sync-from-calendar] Adding new event from Google Calendar..."

# Check app database
# Event should have googleCalendarEventId matching Google Calendar's event ID
```

---

### Test 5: Update Event in Google Calendar → Updates in App

**Steps**:
1. Find the event created in Test 4 in Google Calendar
2. Edit the event
3. Change title to "Updated Event - GCal"
4. Change time to 11:00 AM
5. Save changes
6. Wait 5-10 seconds (with webhooks) or manually sync

**Expected Result**:
- Event updates in the app
- Title and time match Google Calendar
- `lastSyncedAt` timestamp is updated

**How to Verify**:
```bash
# Check Convex logs
# Look for: "[sync-from-calendar] Updating event: Updated Event - GCal"

# Check app
# Event should show new title and time
```

---

### Test 6: Delete Event in Google Calendar → Deletes from App

**Steps**:
1. Find the event from Test 5 in Google Calendar
2. Delete the event
3. Wait 5-10 seconds (with webhooks) or manually sync

**Expected Result**:
- Event removed from the app

**How to Verify**:
```bash
# Check Convex logs
# Look for: "[sync-from-calendar] Deleting event removed from Google Calendar..."

# Check app
# Event should no longer appear
```

---

### Test 7: Conflict Resolution - Same Event Updated in Both Places

This tests the "last-write-wins" conflict resolution strategy.

**Steps**:
1. Create an event in the app, wait for sync to Google Calendar
2. Disable internet or webhooks temporarily
3. Update the event in the app (e.g., change title to "Updated in App")
4. Update the same event in Google Calendar (e.g., change title to "Updated in GCal")
5. Re-enable internet and trigger sync

**Expected Result**:
- The most recent update wins (based on timestamps)
- If Google Calendar was updated more recently, app shows "Updated in GCal"
- If app was updated more recently, Google Calendar shows "Updated in App"

**How to Verify**:
```bash
# Check Convex logs
# Look for timestamp comparisons:
# "[sync-from-calendar] GCal updated: ..., Last sync: ..."

# Check both app and Google Calendar
# Should show the same final state
```

---

### Test 8: Bulk Sync - Multiple Events

**Steps**:
1. Create 10 events directly in Google Calendar
   - Mix of all-day and timed events
   - Various dates in the future
2. Trigger sync from app

**Expected Result**:
- All 10 events appear in the app
- Each has correct date, time, and details
- Sync completes in reasonable time (< 30 seconds)

**How to Verify**:
```bash
# Check Convex logs
# Look for: "[sync-from-calendar] Sync complete: 10 added, 0 updated, 0 deleted"

# Count events in app
# Should have all 10 new events
```

---

### Test 9: All-Day Events

**Steps**:
1. Create an all-day event in the app:
   - Title: "All Day Test"
   - Date: Next Monday
   - No time specified
2. Wait for sync
3. Create an all-day event in Google Calendar:
   - Title: "All Day Test GCal"
   - Date: Next Tuesday
4. Sync to app

**Expected Result**:
- Both all-day events sync correctly
- Events show as all-day in both systems
- No time information is added or lost

---

### Test 10: Webhook Expiration and Renewal

**Steps**:
1. Set up webhook with `/api/setup-calendar-watch`
2. Note the expiration time (7 days in the future)
3. Wait until webhook is about to expire (or manually trigger cron)
4. Check that webhook is renewed automatically

**Expected Result**:
- Webhook is renewed before expiration
- New expiration date is 7 days from renewal
- Real-time sync continues to work

**How to Verify**:
```bash
# Check cron job logs
# Look for: "[webhook-renewal] Successfully renewed webhook..."

# Check family record in database
# calendarWebhookExpiration should be updated
```

---

## Performance Testing

### Test 11: Sync Speed

Measure time from event creation to sync completion:

1. Create event in app at time T0
2. Record time T1 when event appears in Google Calendar
3. Calculate sync time: T1 - T0

**Expected**: < 5 seconds for most operations

### Test 12: Concurrent Updates

1. Have two users in the same family
2. Both update different events simultaneously
3. Verify all changes sync correctly without data loss

---

## Error Handling Tests

### Test 13: No Internet Connection

**Steps**:
1. Disconnect internet
2. Try to create/update/delete event
3. Reconnect internet

**Expected Result**:
- Event operations succeed in local database
- Sync is queued and executes when connection returns
- Error messages are user-friendly

### Test 14: Invalid OAuth Token

**Steps**:
1. Manually revoke OAuth access in Google Account settings
2. Try to sync events

**Expected Result**:
- App detects invalid token
- Shows error message asking user to reconnect
- Provides button to re-authenticate

### Test 15: Calendar Not Found

**Steps**:
1. Delete the selected calendar in Google Calendar
2. Try to sync events

**Expected Result**:
- App detects missing calendar
- Shows error message
- Allows user to select a different calendar

---

## Logging and Monitoring

### What to Check in Logs

**Successful Create**:
```
[CALENDAR SYNC] Starting sync for event ID: k1...
[CALENDAR SYNC] Retrieved event: Test Event...
[CALENDAR SYNC] Adding event "Test Event" to Google Calendar
[CALENDAR SYNC] Event created in Google Calendar with ID: abc123
[CALENDAR SYNC] Successfully synced event k1... to Google Calendar
```

**Successful Update**:
```
[CALENDAR SYNC UPDATE] Starting update sync for event ID: k1...
[CALENDAR SYNC UPDATE] Updating event "Test Event" in Google Calendar
[CALENDAR SYNC UPDATE] Successfully updated event k1... in Google Calendar
```

**Successful Delete**:
```
[CALENDAR SYNC DELETE] Starting delete sync for Google Calendar event ID: abc123
[CALENDAR SYNC DELETE] Deleting event from Google Calendar
[CALENDAR SYNC DELETE] Successfully deleted event abc123 from Google Calendar
```

**Successful Sync from Google Calendar**:
```
[sync-from-calendar] Starting sync from Google Calendar...
[sync-from-calendar] Found 15 events in Google Calendar
[sync-from-calendar] Adding new event from Google Calendar: Test Event
[sync-from-calendar] Sync complete: 1 added, 0 updated, 0 deleted
```

---

## Rollback Procedure

If issues arise and you need to disable sync:

1. **Disable Auto-Sync**:
   - Comment out scheduler calls in `convex/events.ts`
   - Redeploy Convex functions

2. **Stop Webhooks**:
   - Set all `calendarWebhookChannelId` to null in database
   - Webhooks will expire naturally after 7 days

3. **Manual Sync Only**:
   - Keep `/api/sync-from-calendar` available
   - Users can manually trigger sync when needed

---

## Success Criteria

The sync implementation is successful if:

✅ Events created in app appear in Google Calendar within 10 seconds
✅ Events created in Google Calendar appear in app within 10 seconds (with webhooks)
✅ Updates sync bidirectionally within 10 seconds
✅ Deletions sync bidirectionally within 10 seconds
✅ No duplicate events are created
✅ No infinite sync loops occur
✅ Conflict resolution works correctly (last-write-wins)
✅ All-day events sync correctly
✅ Timed events sync with correct times
✅ Error handling is graceful and user-friendly
✅ Webhooks renew automatically before expiration
✅ Performance is acceptable (< 5 seconds per operation)
✅ Sync status is visible to users

---

## Debugging Tips

**Event not syncing to Google Calendar?**
- Check if `googleCalendarId` is set for the family
- Verify Gmail account is connected and active
- Look for OAuth token errors in logs
- Check if event is confirmed (`isConfirmed: true`)

**Event not syncing from Google Calendar?**
- Verify webhook is set up (check `calendarWebhookChannelId`)
- Try manual sync with `/api/sync-from-calendar`
- Check if correct calendar is selected
- Verify OAuth scopes include calendar access

**Duplicate events appearing?**
- Check if multiple webhooks are registered
- Verify `googleCalendarEventId` is being saved correctly
- Look for race conditions in logs

**Sync seems slow?**
- Check network latency
- Verify Google Calendar API is responding quickly
- Look for rate limiting errors
- Consider background job queue status

---

## Automated Testing (TODO)

Future enhancement: Create automated E2E tests using Playwright or Cypress.

Example test structure:
```javascript
describe('Google Calendar Sync', () => {
  it('should sync event creation from app to Google Calendar', async () => {
    // Create event in app
    // Wait for sync
    // Verify event exists in Google Calendar
  });

  it('should sync event updates bidirectionally', async () => {
    // Create and sync event
    // Update in app
    // Verify update in Google Calendar
    // Update in Google Calendar
    // Verify update in app
  });

  // More tests...
});
```
