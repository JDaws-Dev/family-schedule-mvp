import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";

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
    const { familyId, calendarName } = await request.json();

    if (!familyId || !calendarName) {
      return NextResponse.json({ error: "Missing familyId or calendarName" }, { status: 400 });
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

    // Get Gmail account for this family
    const gmailAccounts = await convex.query(api.gmailAccounts.getActiveGmailAccounts, {
      familyId,
    });

    if (!gmailAccounts || gmailAccounts.length === 0) {
      return NextResponse.json(
        { error: "No Gmail account connected" },
        { status: 400 }
      );
    }

    const account = gmailAccounts[0];

    // Refresh access token
    const accessToken = await refreshAccessToken(account.refreshToken);

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Create new calendar
    const newCalendar = await calendar.calendars.insert({
      requestBody: {
        summary: calendarName,
        description: "Family events automatically synced from Our Daily Family app",
        timeZone: "America/New_York",
      },
    });

    const calendarId = newCalendar.data.id;

    if (!calendarId) {
      return NextResponse.json({ error: "Failed to create calendar" }, { status: 500 });
    }

    // Save to family record
    await convex.mutation(api.families.updateSelectedCalendar, {
      familyId,
      googleCalendarId: calendarId,
      calendarName,
    });

    return NextResponse.json({
      success: true,
      calendar: {
        id: calendarId,
        summary: calendarName,
      },
    });
  } catch (error: any) {
    console.error("Error creating Google Calendar:", error);
    return NextResponse.json(
      {
        error: "Failed to create calendar",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
