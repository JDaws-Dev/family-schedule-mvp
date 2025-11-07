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

async function findFamilyCalendar(calendar: any) {
  const CALENDAR_NAME = "Family Schedule";

  const calendarList = await calendar.calendarList.list();
  const existingCalendar = calendarList.data.items?.find(
    (cal: any) => cal.summary === CALENDAR_NAME
  );

  return existingCalendar?.id;
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

    // Check if event has Google Calendar ID
    if (!event.googleCalendarEventId) {
      return NextResponse.json({
        success: true,
        message: "Event was not synced to Google Calendar",
      });
    }

    // Get a Gmail account for this family to use for Calendar API
    const gmailAccounts = await convex.query(api.gmailAccounts.getActiveGmailAccounts, {
      familyId: event.familyId,
    });

    if (!gmailAccounts || gmailAccounts.length === 0) {
      return NextResponse.json(
        { error: "No Gmail account connected. Cannot update Google Calendar." },
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

    // Build Google Calendar event
    const startDateTime = event.eventTime
      ? `${event.eventDate}T${event.eventTime}:00`
      : event.eventDate;

    const endDateTime = event.endTime
      ? `${event.eventDate}T${event.endTime}:00`
      : event.eventTime
      ? `${event.eventDate}T${parseInt(event.eventTime.split(":")[0]) + 1}:${event.eventTime.split(":")[1]}:00`
      : event.eventDate;

    // Build comprehensive description for Google Calendar
    let fullDescription = event.description || "";

    if (event.childName) {
      fullDescription += `\n\nFamily Member: ${event.childName}`;
    }

    if (event.category) {
      fullDescription += `\nCategory: ${event.category}`;
    }

    if (event.requiresAction) {
      fullDescription += `\n\n⚠️ RSVP REQUIRED`;
      if (event.actionDeadline) {
        fullDescription += ` by ${event.actionDeadline}`;
      }
    }

    if (event.sourceEmailSubject) {
      fullDescription += `\n\nSource: ${event.sourceEmailSubject}`;
    }

    const calendarEvent = {
      summary: event.title,
      description: fullDescription.trim() || "No additional details",
      location: event.location,
      start: event.eventTime
        ? { dateTime: startDateTime, timeZone: "America/New_York" }
        : { date: event.eventDate },
      end: event.endTime || event.eventTime
        ? { dateTime: endDateTime, timeZone: "America/New_York" }
        : { date: event.eventDate },
      reminders: {
        useDefault: true,
      },
    };

    // Update event in Google Calendar
    console.log(`Updating event ${event.googleCalendarEventId} in Google Calendar ${calendarId}`);
    const response = await calendar.events.update({
      calendarId: calendarId,
      eventId: event.googleCalendarEventId,
      requestBody: calendarEvent,
    });

    return NextResponse.json({
      success: true,
      message: "Event updated in Google Calendar",
      googleCalendarLink: response.data.htmlLink,
    });
  } catch (error: any) {
    console.error("Error updating Google Calendar:", error);

    return NextResponse.json(
      {
        error: "Failed to update Google Calendar",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
