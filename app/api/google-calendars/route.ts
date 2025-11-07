import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";

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

export async function POST(request: NextRequest) {
  try {
    const { familyId } = await request.json();

    if (!familyId) {
      return NextResponse.json({ error: "Missing familyId" }, { status: 400 });
    }

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

    // List all calendars
    const calendarList = await calendar.calendarList.list();

    const calendars = calendarList.data.items?.map((cal: any) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
      accessRole: cal.accessRole,
    })) || [];

    return NextResponse.json({ calendars });
  } catch (error: any) {
    console.error("Error fetching Google Calendars:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch calendars",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
