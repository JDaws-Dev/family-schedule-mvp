import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { internal } from "@/convex/_generated/api";

// This endpoint will be called by Vercel cron hourly to send event reminders
// Vercel Cron docs: https://vercel.com/docs/cron-jobs
export async function GET(request: NextRequest) {
  // Verify this is a Vercel cron job (security)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Initialize Convex client inside the handler to avoid build-time errors
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  try {
    console.log("Starting reminder cron job...");

    // Call the Convex action to send event reminders
    await convex.action(internal.notifications.sendEventReminders, {});

    // Call the Convex action to send RSVP alerts
    await convex.action(internal.notifications.sendRSVPAlerts, {});

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Reminder cron job completed successfully",
    });
  } catch (error: any) {
    console.error("Reminder cron job error:", error);
    return NextResponse.json(
      { error: "Reminder cron job failed", details: error.message },
      { status: 500 }
    );
  }
}
