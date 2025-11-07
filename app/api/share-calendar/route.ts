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
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, role } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get Clerk JWT token for authenticated Convex queries
    const token = await getToken({ template: "convex" });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

    // Get user from Convex
    const user = await convex.query(api.users.getUserByClerkId, {
      clerkId: userId,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get a Gmail account for this family
    const gmailAccounts = await convex.query(api.gmailAccounts.getActiveGmailAccounts, {
      familyId: user.familyId,
    });

    if (!gmailAccounts || gmailAccounts.length === 0) {
      return NextResponse.json(
        { error: "No Gmail account connected" },
        { status: 400 }
      );
    }

    const account = gmailAccounts[0];
    const accessToken = await refreshAccessToken(account.refreshToken);

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Find Family Schedule calendar
    const calendarId = await findFamilyCalendar(calendar);

    if (!calendarId) {
      return NextResponse.json(
        { error: "Family Schedule calendar not found. Please sync an event first." },
        { status: 404 }
      );
    }

    // Share the calendar
    await calendar.acl.insert({
      calendarId: calendarId,
      requestBody: {
        role: role || "reader", // reader (view only) or writer (can edit)
        scope: {
          type: "user",
          value: email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Calendar shared with ${email}`,
    });
  } catch (error: any) {
    console.error("Error sharing calendar:", error);
    return NextResponse.json(
      {
        error: "Failed to share calendar",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
