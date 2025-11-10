import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from "uuid";

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

/**
 * Setup Google Calendar Push Notifications
 *
 * This registers a "watch" on the family's Google Calendar so that
 * Google will notify us (via webhook) whenever events change.
 *
 * Reference: https://developers.google.com/calendar/api/guides/push
 */
export async function POST(request: NextRequest) {
  try {
    const { familyId } = await request.json();

    if (!familyId) {
      return NextResponse.json({ error: "Missing familyId" }, { status: 400 });
    }

    console.log("[setup-calendar-watch] Setting up watch for family:", familyId);

    // Get Clerk JWT token
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

    // Get family and Gmail account
    const family = await convex.query(api.families.getFamilyById, { familyId });

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

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

    // Get calendar ID
    const calendarId = family.googleCalendarId || "primary";

    // Generate unique channel ID and resource ID
    const channelId = `family-${familyId}-${uuidv4()}`;
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://family-schedule-mvp.vercel.app"}/api/calendar-webhook`;

    console.log("[setup-calendar-watch] Setting up watch with:", {
      calendarId,
      channelId,
      webhookUrl,
    });

    // Stop existing watch if any
    if (family.calendarWebhookChannelId && family.calendarWebhookResourceId) {
      try {
        console.log("[setup-calendar-watch] Stopping existing watch...");
        await calendar.channels.stop({
          requestBody: {
            id: family.calendarWebhookChannelId,
            resourceId: family.calendarWebhookResourceId,
          },
        });
        console.log("[setup-calendar-watch] Existing watch stopped");
      } catch (error) {
        console.log("[setup-calendar-watch] Could not stop existing watch (may have expired):", error);
      }
    }

    // Set up new watch
    // Note: Google Calendar watch expires after ~7 days, so we'll need to renew it
    const watchResponse = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        // Expiration: 7 days from now (in milliseconds)
        expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(),
      },
    });

    console.log("[setup-calendar-watch] Watch response:", {
      channelId: watchResponse.data.id,
      resourceId: watchResponse.data.resourceId,
      expiration: watchResponse.data.expiration,
    });

    // Save webhook info to family record
    await convex.mutation(api.families.updateCalendarWebhook, {
      familyId,
      calendarWebhookChannelId: watchResponse.data.id!,
      calendarWebhookResourceId: watchResponse.data.resourceId!,
      calendarWebhookExpiration: watchResponse.data.expiration
        ? parseInt(watchResponse.data.expiration)
        : undefined,
    });

    console.log("[setup-calendar-watch] Watch setup complete!");

    return NextResponse.json({
      success: true,
      message: "Push notifications enabled",
      channelId: watchResponse.data.id,
      expiresAt: watchResponse.data.expiration
        ? new Date(parseInt(watchResponse.data.expiration)).toISOString()
        : undefined,
    });
  } catch (error: any) {
    console.error("[setup-calendar-watch] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to setup push notifications",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
