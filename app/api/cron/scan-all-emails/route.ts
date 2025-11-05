import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// This endpoint will be called by Vercel cron daily
// Vercel Cron docs: https://vercel.com/docs/cron-jobs
export async function GET(request: NextRequest) {
  // Verify this is a Vercel cron job (security)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all families
    const families = await convex.query(api.families.getAllFamilies);

    const results: any[] = [];

    for (const family of families) {
      // Get active Gmail accounts for this family
      const gmailAccounts = await convex.query(api.gmailAccounts.getActiveGmailAccounts, {
        familyId: family._id,
      });

      for (const account of gmailAccounts) {
        // Trigger email scan for each account
        const scanResult = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scan-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: account._id }),
        });

        const scanData = await scanResult.json();

        results.push({
          familyId: family._id,
          accountId: account._id,
          gmailEmail: account.gmailEmail,
          ...scanData,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      familiesScanned: families.length,
      results,
    });
  } catch (error: any) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Cron job failed", details: error.message },
      { status: 500 }
    );
  }
}
