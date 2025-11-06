import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

async function findOrCreateFamilyCalendar(calendar: any) {
  const CALENDAR_NAME = "Family Schedule";

  // List all calendars to find our custom calendar
  console.log("Listing all calendars...");
  const calendarList = await calendar.calendarList.list();
  console.log("Found calendars:", calendarList.data.items?.map((c: any) => c.summary));

  const existingCalendar = calendarList.data.items?.find(
    (cal: any) => cal.summary === CALENDAR_NAME
  );

  if (existingCalendar) {
    console.log("Found existing Family Schedule calendar:", existingCalendar.id);
    return existingCalendar.id;
  }

  // Create new calendar if it doesn't exist
  console.log("Creating new Family Schedule calendar...");
  const newCalendar = await calendar.calendars.insert({
    requestBody: {
      summary: CALENDAR_NAME,
      description: "Family events automatically synced from Our Daily Family app",
      timeZone: "America/New_York",
    },
  });
  console.log("Created new calendar:", newCalendar.data.id);

  return newCalendar.data.id;
}

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    // Get event from Convex
    const event = await convex.query(api.events.getEventById, {
      eventId: eventId as Id<"events">
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if already synced to Google Calendar
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
        { error: "No Gmail account connected. Please connect a Gmail account first." },
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

    // Find or create "Family Schedule" calendar
    console.log("Finding or creating Family Schedule calendar...");
    const calendarId = await findOrCreateFamilyCalendar(calendar);
    console.log("Calendar ID:", calendarId);

    // Save calendar ID to family record if not already set
    const family = await convex.query(api.families.getFamilyById, {
      familyId: event.familyId,
    });

    if (!family?.googleCalendarId || family.googleCalendarId !== calendarId) {
      console.log("Saving Google Calendar ID to family record...");
      await convex.mutation(api.googleCalendar.createFamilyCalendar, {
        familyId: event.familyId,
        userId: event.createdByUserId,
        googleCalendarId: calendarId,
        calendarName: "Family Schedule",
      });
      console.log("Google Calendar ID saved successfully");
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

    // Create event in Google Calendar
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: calendarEvent,
    });

    const googleEventId = response.data.id;

    // Update event in Convex with Google Calendar event ID
    await convex.mutation(api.events.updateEvent, {
      eventId: eventId as Id<"events">,
      googleCalendarEventId: googleEventId,
    });

    // Update lastCalendarSyncAt timestamp on family record
    await convex.mutation(api.families.updateLastCalendarSync, {
      familyId: event.familyId,
    });

    return NextResponse.json({
      success: true,
      message: "Event added to Google Calendar",
      googleCalendarEventId: googleEventId,
      googleCalendarLink: response.data.htmlLink,
    });
  } catch (error: any) {
    console.error("Error pushing to Google Calendar:", error);

    // Check if this is a permissions error
    const isPermissionError =
      error.message?.includes("insufficient") ||
      error.message?.includes("permission") ||
      error.message?.includes("scope") ||
      error.code === 403;

    if (isPermissionError) {
      return NextResponse.json(
        {
          error: "calendar_permission_required",
          message: "Calendar permissions are required. Please reconnect your Google account.",
          needsReconnect: true,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to push to Google Calendar",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
