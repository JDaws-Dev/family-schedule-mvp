import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);


async function refreshAccessToken(refreshToken: string) {
  console.log("[google-calendars] Refreshing access token...");
  console.log("[google-calendars] Has refresh token:", !!refreshToken);
  console.log("[google-calendars] Has client ID:", !!process.env.GOOGLE_CLIENT_ID);
  console.log("[google-calendars] Has client secret:", !!process.env.GOOGLE_CLIENT_SECRET);

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
  console.log("[google-calendars] Token refresh response:", {
    ok: response.ok,
    status: response.status,
    hasAccessToken: !!data.access_token,
    error: data.error,
    errorDescription: data.error_description,
  });

  if (!data.access_token) {
    throw new Error(`Failed to refresh token: ${data.error} - ${data.error_description}`);
  }

  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { familyId } = await request.json();
    console.log("[google-calendars] Received request for familyId:", familyId);

    if (!familyId) {
      return NextResponse.json({ error: "Missing familyId" }, { status: 400 });
    }

    // Get Gmail account for this family
    console.log("[google-calendars] Fetching Gmail accounts...");
    const gmailAccounts = await convex.query(api.gmailAccounts.getActiveGmailAccounts, {
      familyId,
    });

    console.log("[google-calendars] Found Gmail accounts:", gmailAccounts?.length || 0);

    if (!gmailAccounts || gmailAccounts.length === 0) {
      return NextResponse.json(
        { error: "No Gmail account connected" },
        { status: 400 }
      );
    }

    const account = gmailAccounts[0];
    console.log("[google-calendars] Using account:", account.gmailEmail);
    console.log("[google-calendars] Account has refresh token:", !!account.refreshToken);

    // Refresh access token
    const accessToken = await refreshAccessToken(account.refreshToken);
    console.log("[google-calendars] Got access token, initializing Calendar API...");

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // List all calendars
    console.log("[google-calendars] Listing calendars...");
    const calendarList = await calendar.calendarList.list();
    console.log("[google-calendars] Found calendars:", calendarList.data.items?.length || 0);

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
    console.error("[google-calendars] Error fetching Google Calendars:", error);
    console.error("[google-calendars] Error stack:", error.stack);
    return NextResponse.json(
      {
        error: "Failed to fetch calendars",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
