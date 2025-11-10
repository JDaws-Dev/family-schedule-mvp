import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { Id } from "@/convex/_generated/dataModel";

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    // Get Clerk JWT token for authenticated Convex queries
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

    // Get event from Convex
    const event = await convex.query(api.events.getEventById, {
      eventId: eventId as Id<"events">
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // If event already has a Google Calendar ID, it's already synced
    if (event.googleCalendarEventId) {
      return NextResponse.json({
        success: true,
        message: "Event already synced to Google Calendar",
        googleCalendarEventId: event.googleCalendarEventId,
      });
    }

    // Get a Gmail account for this family to use for Calendar API
    const gmailAccounts = await convex.query(api.gmailAccounts.getActiveGmailAccounts, {
      familyId: event.familyId,
    });

    if (!gmailAccounts || gmailAccounts.length === 0) {
      return NextResponse.json(
        { error: "No Gmail account connected. Cannot add to Google Calendar." },
        { status: 400 }
      );
    }

    // Use the first active Gmail account
    const account = gmailAccounts[0];

    // Refresh access token
    const accessToken = await refreshAccessToken(account.refreshToken);

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Get family to find selected calendar
    const family = await convex.query(api.families.getFamilyById, {
      familyId: event.familyId,
    });

    const calendarId = family?.googleCalendarId;

    if (!calendarId) {
      return NextResponse.json(
        { error: "No calendar selected. Please select a calendar in Settings." },
        { status: 404 }
      );
    }

    // Build start and end date/time
    const startDateTime = event.eventTime
      ? `${event.eventDate}T${event.eventTime}:00`
      : event.eventDate;

    const endDateTime = event.endTime
      ? `${event.eventDate}T${event.endTime}:00`
      : event.eventTime
        ? `${event.eventDate}T${event.eventTime}:00` // Default to same as start if only start time provided
        : event.eventDate;

    // Create event in Google Calendar
    const calendarEvent = {
      summary: event.title,
      description: event.description || "",
      location: event.location || "",
      start: event.eventTime ? {
        dateTime: startDateTime,
        timeZone: "America/New_York", // TODO: Make timezone configurable
      } : {
        date: event.eventDate,
      },
      end: event.eventTime ? {
        dateTime: endDateTime,
        timeZone: "America/New_York",
      } : {
        date: event.eventDate,
      },
    };

    console.log(`Adding event "${event.title}" to Google Calendar ${calendarId}`);
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: calendarEvent,
    });

    const googleCalendarEventId = response.data.id;

    // Update the event in Convex with the Google Calendar ID
    await convex.mutation(api.events.updateEvent, {
      eventId: eventId as Id<"events">,
      googleCalendarEventId: googleCalendarEventId,
    });

    return NextResponse.json({
      success: true,
      message: "Event added to Google Calendar",
      googleCalendarEventId: googleCalendarEventId,
    });
  } catch (error: any) {
    console.error("Error adding to Google Calendar:", error);

    return NextResponse.json(
      {
        error: "Failed to add to Google Calendar",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
