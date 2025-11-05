import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    }

    const convex = getConvexClient();

    const result = await convex.mutation(api.emailProcessing.clearProcessingLog, {
      gmailAccountId: accountId,
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error("Error clearing processing log:", error);
    return NextResponse.json(
      { error: "Failed to clear log", details: error.message },
      { status: 500 }
    );
  }
}
