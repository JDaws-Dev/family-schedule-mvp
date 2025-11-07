import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { internal } from "@/convex/_generated/api";

// This endpoint will be called by Vercel cron daily to send SMS digests
export async function GET(request: NextRequest) {
  // Verify this is a Vercel cron job (security)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Initialize Convex client inside the handler to avoid build-time errors
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  try {
    console.log("Starting daily SMS digest cron job...");

    // Call the Convex action to send daily SMS digests
    await convex.action(internal.notifications.sendDailySmsDigests, {});

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Daily SMS digest cron job completed successfully",
    });
  } catch (error: any) {
    console.error("Daily SMS digest cron job error:", error);
    return NextResponse.json(
      { error: "Daily SMS digest cron job failed", details: error.message },
      { status: 500 }
    );
  }
}
