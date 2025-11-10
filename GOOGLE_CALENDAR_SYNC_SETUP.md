# Google Calendar Two-Way Sync Setup Guide

This guide explains how the two-way Google Calendar synchronization works and how to set it up.

## Overview

The Family Schedule MVP app now has complete two-way synchronization with Google Calendar:

1. **App → Google Calendar**: When you create, update, or delete an event in the app, it automatically syncs to your Google Calendar
2. **Google Calendar → App**: When you create, update, or delete an event in Google Calendar, it automatically syncs back to the app

## Architecture

### Components

1. **Convex Functions** (`convex/calendarSync.ts`):
   - `syncEventToGoogleCalendar`: Creates new events in Google Calendar
   - `updateEventInGoogleCalendar`: Updates existing events in Google Calendar
   - `deleteEventFromGoogleCalendar`: Deletes events from Google Calendar

2. **Event Mutations** (`convex/events.ts`):
   - `createEvent`: Automatically schedules sync when confirmed events are created
   - `updateEvent`: Automatically schedules sync when synced events are updated
   - `deleteEvent`: Automatically schedules sync when synced events are deleted
   - `confirmEvent`: Triggers sync when an unconfirmed event is confirmed

3. **API Routes**:
   - `/api/sync-from-calendar`: Pulls events from Google Calendar to the app
   - `/api/calendar-webhook`: Receives push notifications from Google Calendar
   - `/api/setup-calendar-watch`: Sets up webhook subscriptions with Google Calendar

4. **Webhook System**:
   - Google Calendar sends push notifications when events change
   - Webhooks are automatically renewed via cron job (they expire after 7 days)

### Conflict Resolution

The system uses a "last-write-wins" strategy with timestamp tracking:

- Each event stores a `lastSyncedAt` timestamp
- When syncing from Google Calendar, we compare Google's `updated` timestamp with our `lastSyncedAt`
- Only events where Google Calendar was updated more recently are synced to avoid infinite loops
- This prevents changes from bouncing back and forth between systems

### Schema Changes

The `events` table includes these sync-related fields:
- `googleCalendarEventId` (optional string): Links the event to its Google Calendar counterpart
- `lastSyncedAt` (optional number): Timestamp of the last successful sync

The `families` table includes these calendar-related fields:
- `googleCalendarId` (optional string): The selected Google Calendar ID to sync with
- `calendarName` (optional string): The name of the selected calendar
- `lastCalendarSyncAt` (optional number): Last time we synced from Google Calendar
- `calendarWebhookChannelId` (optional string): Webhook subscription ID
- `calendarWebhookResourceId` (optional string): Google's resource ID for the webhook
- `calendarWebhookExpiration` (optional number): When the webhook subscription expires

## Setup Instructions

### 1. Environment Variables

The following environment variables are already configured in your `.env.local`:

```bash
# Google OAuth (already set)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# App URL (update for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Production**: Update `NEXT_PUBLIC_APP_URL` to your production domain (e.g., `https://your-domain.com`)

### 2. Google Cloud Console Setup

Your Google OAuth credentials must have the following scopes enabled:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Edit your OAuth 2.0 Client ID
5. Ensure these scopes are enabled:
   - `https://www.googleapis.com/auth/gmail.readonly` (for email scanning)
   - `https://www.googleapis.com/auth/calendar` (for calendar read/write)
   - `https://www.googleapis.com/auth/calendar.events` (for event management)

6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`

7. Add webhook URLs to authorized domains (for production):
   - Navigate to "APIs & Services" > "Domain verification"
   - Verify your production domain
   - Add webhook endpoint: `https://your-domain.com/api/calendar-webhook`

### 3. Enable Google Calendar Push Notifications

For the webhook system to work in production, you need to:

1. **Enable the Calendar API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

2. **Set up Domain Verification** (production only):
   - Google Calendar webhooks require domain verification
   - Follow Google's [domain verification guide](https://developers.google.com/calendar/api/guides/push)

### 4. User Setup Flow

Once the above is configured, users need to:

1. **Connect their Gmail account**:
   - Go to Settings
   - Click "Connect Gmail Account"
   - Authorize the app

2. **Select a Google Calendar**:
   - After connecting Gmail, go to Settings
   - Choose which Google Calendar to sync with (Primary, Work, Family, etc.)
   - The app will store the selected calendar ID

3. **Enable Push Notifications** (optional but recommended):
   - In Settings, click "Enable Real-time Sync"
   - This sets up webhooks so changes in Google Calendar appear instantly
   - Webhooks are automatically renewed every 7 days

## How It Works

### Creating Events

```
User creates event in app
    ↓
Event saved to Convex database
    ↓
Scheduler triggers syncEventToGoogleCalendar
    ↓
Event created in Google Calendar
    ↓
googleCalendarEventId and lastSyncedAt saved to Convex
```

### Updating Events

```
User updates event in app
    ↓
Event updated in Convex database
    ↓
Scheduler triggers updateEventInGoogleCalendar
    ↓
Event updated in Google Calendar
    ↓
lastSyncedAt updated in Convex
```

### Deleting Events

```
User deletes event in app
    ↓
Event deleted from Convex database
    ↓
Scheduler triggers deleteEventFromGoogleCalendar
    ↓
Event deleted from Google Calendar
```

### Syncing from Google Calendar

**With Webhooks (Real-time)**:
```
User creates/updates/deletes event in Google Calendar
    ↓
Google sends webhook notification to /api/calendar-webhook
    ↓
Webhook triggers /api/sync-from-calendar
    ↓
Events synced from Google Calendar to Convex database
    ↓
lastSyncedAt updated for each synced event
```

**Without Webhooks (Manual)**:
```
User clicks "Sync Now" button in UI
    ↓
App calls /api/sync-from-calendar
    ↓
Events synced from Google Calendar to Convex database
```

## Testing the Integration

### Test Event Creation (App → Google Calendar)

1. Create an event in the app
2. Wait a few seconds for background sync
3. Check your Google Calendar - the event should appear
4. Event should have all details (title, date, time, location, description)

### Test Event Update (App → Google Calendar)

1. Edit an existing synced event in the app
2. Change the title, date, or location
3. Check Google Calendar - changes should appear within seconds

### Test Event Deletion (App → Google Calendar)

1. Delete a synced event from the app
2. Check Google Calendar - event should be deleted

### Test Google Calendar → App Sync

**With Webhooks**:
1. Create an event directly in Google Calendar
2. Wait a few seconds
3. Refresh the app - new event should appear

**Without Webhooks**:
1. Create an event directly in Google Calendar
2. Click "Sync Now" in the app
3. New event should appear

### Test Conflict Resolution

1. Create an event in the app, wait for sync
2. Update the event in Google Calendar
3. Wait for webhook notification (or click "Sync Now")
4. App should show the Google Calendar version (last-write-wins)

## Monitoring and Debugging

### Check Sync Status

The app includes a sync status component that shows:
- Last email scan time
- Last calendar sync time
- Number of connected accounts
- Calendar connection status

### View Logs

**Server Logs** (see console output):
- `[CALENDAR SYNC]`: Event creation in Google Calendar
- `[CALENDAR SYNC UPDATE]`: Event updates in Google Calendar
- `[CALENDAR SYNC DELETE]`: Event deletions from Google Calendar
- `[sync-from-calendar]`: Syncing from Google Calendar to app
- `[calendar-webhook]`: Webhook notifications received

**Check Sync Timestamps**:
- Events have `lastSyncedAt` field showing when they were last synced
- Families have `lastCalendarSyncAt` showing last full sync time

### Common Issues

**Events not syncing to Google Calendar**:
- Check that family has `googleCalendarId` configured
- Check that Gmail account is connected and active
- Verify OAuth token hasn't expired
- Check server logs for API errors

**Events not syncing from Google Calendar**:
- Check that webhook is set up (or manually trigger sync)
- Verify webhook hasn't expired (renewed automatically every 7 days)
- Check that calendar access is granted
- Verify correct calendar is selected

**Duplicate events**:
- This shouldn't happen due to `googleCalendarEventId` tracking
- If it does, check for race conditions or multiple webhook deliveries

**Infinite sync loops**:
- Prevented by `lastSyncedAt` timestamp comparison
- Only events where Google Calendar was updated after our last sync are pulled
- Only user-initiated updates (not metadata updates) trigger push to Google Calendar

## Limitations and Known Issues

1. **Webhook Expiration**: Google Calendar webhooks expire after 7 days
   - Automatically renewed by cron job in `convex/calendarWebhooks.ts`
   - Cron runs daily at 3 AM UTC
   - Manual renewal available via `/api/setup-calendar-watch`

2. **Timezone Handling**: Currently hardcoded to "America/New_York"
   - TODO: Make timezone configurable per family
   - Consider using user's browser timezone

3. **Recurring Events**:
   - Basic support exists in schema
   - Full recurring event sync not yet implemented
   - Google Calendar handles recurrence differently than our app

4. **Multiple Calendars**:
   - Currently syncs with one selected calendar per family
   - Could be extended to sync with multiple calendars

5. **Rate Limits**:
   - Google Calendar API has rate limits
   - Current implementation has no rate limit handling
   - Consider implementing exponential backoff for production

6. **Sync Delay**:
   - App → Google Calendar: Near-instant (scheduler runs immediately)
   - Google Calendar → App: Depends on webhook delivery (usually < 5 seconds)
   - Without webhooks: Manual sync only

## Future Enhancements

1. **Bidirectional Recurring Events**: Full support for recurring event patterns
2. **Conflict Resolution UI**: Let users choose which version to keep on conflicts
3. **Selective Sync**: Choose which events to sync (by category, family member, etc.)
4. **Multiple Calendar Support**: Sync different categories to different calendars
5. **Offline Support**: Queue sync operations when offline
6. **Sync History**: Show log of all sync operations for debugging
7. **Batch Operations**: Optimize API calls with batch requests

## API Reference

### POST /api/sync-from-calendar

Pulls events from Google Calendar and syncs them to the app.

**Request Body**:
```json
{
  "familyId": "k12abc123..."
}
```

**Response**:
```json
{
  "success": true,
  "addedCount": 5,
  "updatedCount": 2,
  "deletedCount": 1,
  "totalScanned": 50
}
```

### POST /api/setup-calendar-watch

Sets up push notifications for Google Calendar changes.

**Request Body**:
```json
{
  "familyId": "k12abc123..."
}
```

**Response**:
```json
{
  "success": true,
  "channelId": "family-k12abc123-uuid",
  "expiresAt": "2025-11-17T10:30:00Z"
}
```

### POST /api/calendar-webhook

Receives push notifications from Google Calendar (called by Google, not directly).

**Headers**:
- `x-goog-channel-id`: Webhook channel ID
- `x-goog-resource-state`: "sync", "exists", or "not_exists"
- `x-goog-resource-id`: Google's resource identifier

## Security Considerations

1. **OAuth Tokens**: Refresh tokens are stored encrypted in Convex
2. **Webhook Verification**: Webhooks validate channel ID against stored family records
3. **Access Control**: All mutations verify user belongs to family before syncing
4. **HTTPS Only**: Webhooks require HTTPS in production (Google's requirement)
5. **Token Refresh**: Access tokens are automatically refreshed when needed

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify environment variables are set correctly
3. Ensure Google Calendar API is enabled
4. Check OAuth scopes are correct
5. Verify webhook domain is verified (production only)

For questions or issues, refer to:
- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [Convex Documentation](https://docs.convex.dev/)
- Project repository issues
