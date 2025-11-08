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

    // Get family's Google Calendar ID
    const family = await convex.query(api.families.getFamily, { familyId });
    if (!family || !family.googleCalendarId) {
      return NextResponse.json({ error: "No Google Calendar connected" }, { status: 404 });
    }

    console.log("[sync-from-calendar] Family calendar ID:", family.googleCalendarId);

    // Get a Gmail account to use for OAuth (we need the refresh token)
    const gmailAccounts = await convex.query(api.gmailAccounts.getFamilyGmailAccounts, { familyId });
    if (!gmailAccounts || gmailAccounts.length === 0) {
      return NextResponse.json({ error: "No Gmail account connected" }, { status: 404 });
    }

    const account = gmailAccounts[0];
    console.log("[sync-from-calendar] Using Gmail account:", account.gmailEmail);

    // Refresh access token
    const accessToken = await refreshAccessToken(account.refreshToken);

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Get events from Google Calendar (next 90 days)
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);

    console.log("[sync-from-calendar] Fetching events from Google Calendar...");
    const response = await calendar.events.list({
      calendarId: family.googleCalendarId,
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
    const existingEventsMap = new Map(
      existingEvents
        .filter(e => e.googleCalendarEventId)
        .map(e => [e.googleCalendarEventId, e])
    );

    let addedCount = 0;
    let updatedCount = 0;

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
        const startDate = new Date(gEvent.start.dateTime);
        eventDate = startDate.toISOString().split('T')[0];
        eventTime = startDate.toTimeString().slice(0, 5); // HH:MM format

        if (gEvent.end?.dateTime) {
          const endDate = new Date(gEvent.end.dateTime);
          endTime = endDate.toTimeString().slice(0, 5);
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
        // Check if anything changed
        const needsUpdate =
          existing.title !== gEvent.summary ||
          existing.eventDate !== eventDate ||
          existing.eventTime !== eventTime ||
          existing.location !== (gEvent.location || undefined) ||
          existing.description !== (gEvent.description || undefined);

        if (needsUpdate) {
          console.log(`[sync-from-calendar] Updating event: ${gEvent.summary}`);
          await convex.mutation(api.events.updateEvent, {
            eventId: existing._id,
            title: gEvent.summary,
            eventDate,
            eventTime,
            endTime,
            location: gEvent.location || undefined,
            description: gEvent.description || undefined,
          });
          updatedCount++;
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

    console.log(`[sync-from-calendar] Sync complete: ${addedCount} added, ${updatedCount} updated`);

    // Update last sync timestamp
    await convex.mutation(api.families.updateLastCalendarSync, { familyId });

    return NextResponse.json({
      success: true,
      addedCount,
      updatedCount,
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
