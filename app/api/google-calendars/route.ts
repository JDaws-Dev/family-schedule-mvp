import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";


async function refreshAccessToken(refreshToken: string) {
  console.log("[google-calendars] Refreshing access token...");
  console.log("[google-calendars] Has refresh token:", !!refreshToken);
  console.log("[google-calendars] Refresh token length:", refreshToken?.length || 0);
  console.log("[google-calendars] Has client ID:", !!process.env.GOOGLE_CLIENT_ID);
  console.log("[google-calendars] Client ID length:", process.env.GOOGLE_CLIENT_ID?.length || 0);
  console.log("[google-calendars] Has client secret:", !!process.env.GOOGLE_CLIENT_SECRET);
  console.log("[google-calendars] Client secret length:", process.env.GOOGLE_CLIENT_SECRET?.length || 0);

  const requestBody = {
    client_id: process.env.GOOGLE_CLIENT_ID?.trim(),
    client_secret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  };

  console.log("[google-calendars] Request body (censored):", {
    hasClientId: !!requestBody.client_id,
    hasClientSecret: !!requestBody.client_secret,
    hasRefreshToken: !!requestBody.refresh_token,
    grantType: requestBody.grant_type,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
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
    console.error("[google-calendars] FULL ERROR RESPONSE:", JSON.stringify(data, null, 2));
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

    // Get Clerk JWT token for authenticated Convex queries
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });

    if (!token) {
      console.error("[google-calendars] No Clerk token available");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

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

    // Fetch calendars from ALL Gmail accounts
    const allCalendars: any[] = [];

    for (const account of gmailAccounts) {
      try {
        console.log("[google-calendars] Fetching calendars for account:", account.gmailEmail);
        console.log("[google-calendars] Account has refresh token:", !!account.refreshToken);

        // Refresh access token for this account
        const accessToken = await refreshAccessToken(account.refreshToken);
        console.log("[google-calendars] Got access token for", account.gmailEmail);

        // Initialize Google Calendar API
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // List calendars for this account
        console.log("[google-calendars] Listing calendars for", account.gmailEmail);
        const calendarList = await calendar.calendarList.list();
        console.log("[google-calendars] Found", calendarList.data.items?.length || 0, "calendars for", account.gmailEmail);

        // Add calendars with account info
        const calendarsForAccount = calendarList.data.items?.map((cal: any) => ({
          id: cal.id,
          summary: cal.summary,
          description: cal.description,
          primary: cal.primary || false,
          backgroundColor: cal.backgroundColor,
          accessRole: cal.accessRole,
          accountEmail: account.gmailEmail, // Add which account this calendar belongs to
          accountDisplayName: account.displayName,
        })) || [];

        allCalendars.push(...calendarsForAccount);
      } catch (error: any) {
        console.error("[google-calendars] Error fetching calendars for", account.gmailEmail, ":", error.message);
        // Continue with other accounts even if one fails
      }
    }

    console.log("[google-calendars] Total calendars from all accounts:", allCalendars.length);
    return NextResponse.json({ calendars: allCalendars });
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
