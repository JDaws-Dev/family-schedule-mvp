import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

/**
 * Google Calendar Push Notifications Webhook
 *
 * This endpoint receives notifications from Google Calendar when events change.
 * Google will POST to this endpoint whenever:
 * - An event is created
 * - An event is updated
 * - An event is deleted
 *
 * Reference: https://developers.google.com/calendar/api/guides/push
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[calendar-webhook] Received webhook from Google Calendar");

    // Get headers from Google
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceState = request.headers.get("x-goog-resource-state");
    const resourceId = request.headers.get("x-goog-resource-id");

    console.log("[calendar-webhook] Headers:", {
      channelId,
      resourceState,
      resourceId,
    });

    // Verify this is a legitimate Google Calendar notification
    if (!channelId || !resourceState) {
      console.error("[calendar-webhook] Missing required headers");
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }

    // Handle sync notification (initial setup confirmation)
    if (resourceState === "sync") {
      console.log("[calendar-webhook] Sync notification received - webhook setup confirmed");
      return NextResponse.json({ success: true, message: "Webhook registered" });
    }

    // For exists/not_exists states, trigger a sync
    if (resourceState === "exists" || resourceState === "not_exists") {
      console.log(`[calendar-webhook] Calendar changed (${resourceState}), triggering sync...`);

      const convex = getConvexClient();

      // Get the family associated with this channel
      const families = await convex.query(api.families.getAllFamilies);

      // Find the family that has this webhook channel ID
      const family = families.find((f: any) => f.calendarWebhookChannelId === channelId);

      if (!family) {
        console.error("[calendar-webhook] No family found for channel:", channelId);
        return NextResponse.json({ success: true, message: "Channel not found" });
      }

      console.log(`[calendar-webhook] Found family: ${family.name}, triggering sync...`);

      // Trigger sync in the background by calling our sync endpoint
      // Note: We use fetch with a very short timeout since we don't want to block the webhook response
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://family-schedule-mvp.vercel.app"}/api/sync-from-calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId: family._id }),
      }).catch(error => {
        console.error("[calendar-webhook] Error triggering sync:", error);
      });

      console.log("[calendar-webhook] Sync triggered successfully");
    }

    // Always respond quickly to Google to acknowledge receipt
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[calendar-webhook] Error processing webhook:", error);
    // Still return 200 to Google to avoid retries
    return NextResponse.json({ success: false, error: error.message });
  }
}

// Handle verification requests from Google
export async function GET(request: NextRequest) {
  // Google might send GET requests to verify the webhook endpoint
  return NextResponse.json({
    status: "ready",
    message: "Calendar webhook endpoint is active"
  });
}
