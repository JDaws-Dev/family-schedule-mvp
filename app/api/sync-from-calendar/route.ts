import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";

function getConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

async function refreshAccessToken(refreshToken: string) {
  console.log("[sync-from-calendar] Refreshing Google OAuth token...");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("[sync-from-calendar] Failed to refresh token:", data);
    throw new Error(`Failed to refresh access token: ${data.error_description || data.error}`);
  }

  console.log("[sync-from-calendar] Successfully refreshed access token");
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    console.log("[sync-from-calendar] Starting sync from Google Calendar...");
    const { familyId } = await request.json();

    if (!familyId) {
      return NextResponse.json({ error: "Missing familyId" }, { status: 400 });
    }

    const convex = getConvexClient();

    // Get a Gmail account to use for OAuth (we need the refresh token)
    const gmailAccounts = await convex.query(api.gmailAccounts.getFamilyGmailAccounts, { familyId });
    if (!gmailAccounts || gmailAccounts.length === 0) {
      return NextResponse.json({
        error: "Please connect your Google account first",
        needsReconnect: true
      }, { status: 404 });
    }

    const account = gmailAccounts[0];
    console.log("[sync-from-calendar] Using Gmail account:", account.gmailEmail);

    // Refresh access token
    const accessToken = await refreshAccessToken(account.refreshToken);

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Get family to check for selected calendar
    const family = await convex.query(api.families.getFamilyById, { familyId });

    // Use selected calendar if available, otherwise use primary
    const calendarId = family?.googleCalendarId || 'primary';
    const calendarName = family?.calendarName || 'primary calendar';
    console.log("[sync-from-calendar] Using calendar:", calendarName, "for account:", account.gmailEmail);

    // First, verify we have access to the calendar
    try {
      await calendar.calendarList.get({ calendarId });
      console.log("[sync-from-calendar] Calendar access verified");
    } catch (accessError: any) {
      console.error("[sync-from-calendar] Calendar access denied:", accessError.message);
      return NextResponse.json({
        error: "Calendar access denied. Please reconnect your Google account to grant calendar permissions.",
        needsReconnect: true,
        details: accessError.message
      }, { status: 403 });
    }

    // Get events from Google Calendar (next 90 days)
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);

    console.log("[sync-from-calendar] Fetching events from primary calendar...");
    const response = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const googleEvents = response.data.items || [];
    console.log(`[sync-from-calendar] Found ${googleEvents.length} events in Google Calendar`);

    // Get existing events from our database
    const existingEvents = await convex.query(api.events.getConfirmedEvents, { familyId });

    // Create a map of existing events by their Google Calendar Event ID
    const existingEventsMap = new Map<string, typeof existingEvents[0]>(
      existingEvents
        .filter(e => e.googleCalendarEventId)
        .map(e => [e.googleCalendarEventId!, e])
    );

    let addedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    // Create set of Google Calendar event IDs for quick lookup
    const googleEventIds = new Set(googleEvents.map(e => e.id).filter(Boolean));

    // Process each Google Calendar event
    for (const gEvent of googleEvents) {
      if (!gEvent.id || !gEvent.summary) continue;

      // Parse date and time from Google Calendar event
      const start = gEvent.start?.dateTime || gEvent.start?.date;
      const end = gEvent.end?.dateTime || gEvent.end?.date;

      if (!start) continue;

      // Extract date and time
      let eventDate: string;
      let eventTime: string | undefined;
      let endTime: string | undefined;

      if (gEvent.start?.dateTime) {
        // Has specific time
        // Parse the ISO string directly to preserve local time (avoid timezone conversion)
        // Google Calendar returns: "2025-11-11T16:00:00-05:00"
        // We want to extract: date="2025-11-11" time="16:00"
        const startISO = gEvent.start.dateTime;
        const [datePart, timePart] = startISO.split('T');
        eventDate = datePart; // "2025-11-11"
        eventTime = timePart.slice(0, 5); // "16:00" (first 5 chars of "16:00:00-05:00")

        if (gEvent.end?.dateTime) {
          const endISO = gEvent.end.dateTime;
          const endTimePart = endISO.split('T')[1];
          endTime = endTimePart.slice(0, 5);
        }
      } else if (gEvent.start?.date) {
        // All-day event
        eventDate = gEvent.start.date;
      } else {
        // No valid date, skip this event
        continue;
      }

      // Check if we already have this event
      const existing = existingEventsMap.get(gEvent.id);

      if (existing) {
        // Get the last update time from Google Calendar
        const gcalUpdatedAt = gEvent.updated ? new Date(gEvent.updated).getTime() : 0;
        const ourLastSyncAt = existing.lastSyncedAt || 0;

        // Check if anything changed
        const needsUpdate =
          existing.title !== gEvent.summary ||
          existing.eventDate !== eventDate ||
          existing.eventTime !== eventTime ||
          existing.location !== (gEvent.location || undefined) ||
          existing.description !== (gEvent.description || undefined);

        // Only update if Google Calendar was updated after our last sync (avoid infinite loops)
        if (needsUpdate && gcalUpdatedAt > ourLastSyncAt) {
          console.log(`[sync-from-calendar] Updating event: ${gEvent.summary} (GCal updated: ${new Date(gcalUpdatedAt).toISOString()}, Last sync: ${new Date(ourLastSyncAt).toISOString()})`);
          await convex.mutation(api.events.updateEvent, {
            eventId: existing._id,
            title: gEvent.summary,
            eventDate,
            eventTime,
            endTime,
            location: gEvent.location || undefined,
            description: gEvent.description || undefined,
            lastSyncedAt: Date.now(),
          });
          updatedCount++;
        } else if (needsUpdate) {
          console.log(`[sync-from-calendar] Skipping update for event: ${gEvent.summary} (our version is newer)`);
        }
      } else {
        // New event from Google Calendar - add it
        console.log(`[sync-from-calendar] Adding new event from Google Calendar: ${gEvent.summary}`);
        await convex.mutation(api.events.createConfirmedEventFromCalendar, {
          familyId,
          title: gEvent.summary,
          eventDate,
          eventTime,
          endTime,
          location: gEvent.location || undefined,
          description: gEvent.description || undefined,
          googleCalendarEventId: gEvent.id,
        });
        addedCount++;
      }
    }

    // Delete events that exist in our DB but not in Google Calendar
    console.log(`[sync-from-calendar] Checking for deleted events. DB events: ${existingEvents.length}, Google events: ${googleEventIds.size}`);
    for (const existingEvent of existingEvents) {
      if (existingEvent.googleCalendarEventId) {
        const existsInGoogle = googleEventIds.has(existingEvent.googleCalendarEventId);
        if (!existsInGoogle) {
          console.log(`[sync-from-calendar] Deleting event removed from Google Calendar: ${existingEvent.title} (ID: ${existingEvent.googleCalendarEventId})`);
          await convex.mutation(api.events.deleteEvent, {
            eventId: existingEvent._id,
          });
          deletedCount++;
        }
      } else {
        console.log(`[sync-from-calendar] Skipping event without Google Calendar ID: ${existingEvent.title}`);
      }
    }

    console.log(`[sync-from-calendar] Sync complete: ${addedCount} added, ${updatedCount} updated, ${deletedCount} deleted`);

    // Update last sync timestamp
    await convex.mutation(api.families.updateLastCalendarSync, { familyId });

    return NextResponse.json({
      success: true,
      addedCount,
      updatedCount,
      deletedCount,
      totalScanned: googleEvents.length,
    });
  } catch (error: any) {
    console.error("[sync-from-calendar] Sync error:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        error: "Failed to sync from Google Calendar",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
