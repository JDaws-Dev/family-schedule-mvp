import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Scan emails for a specific Gmail account triggered by push notification
 * This is called by the Gmail webhook when new emails arrive
 */
export async function POST(request: NextRequest) {
  try {
    const { emailAddress, historyId } = await request.json();

    if (!emailAddress) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    console.log('[Scan Emails Push] Processing push notification for:', emailAddress, 'historyId:', historyId);

    // Find the Gmail account in our database
    const gmailAccount = await convex.query(api.gmailAccounts.getByEmail, {
      email: emailAddress,
    });

    if (!gmailAccount) {
      console.log('[Scan Emails Push] Gmail account not found:', emailAddress);
      return NextResponse.json(
        { error: 'Gmail account not registered' },
        { status: 404 }
      );
    }

    // Trigger the same email scanning logic as the manual scan
    // but pass the historyId for more efficient scanning
    const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/scan-emails`;

    const scanResponse = await fetch(scanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: gmailAccount._id,
        historyId: historyId, // Only scan emails since this history ID
      }),
    });

    if (!scanResponse.ok) {
      const error = await scanResponse.text();
      console.error('[Scan Emails Push] Scan failed:', error);
      return NextResponse.json(
        { error: 'Failed to scan emails' },
        { status: 500 }
      );
    }

    const result = await scanResponse.json();

    console.log('[Scan Emails Push] Scan complete:', {
      emailAddress,
      eventsFound: result.eventsCreated || 0
    });

    return NextResponse.json({
      success: true,
      emailAddress,
      eventsFound: result.eventsCreated || 0,
    });

  } catch (error: any) {
    console.error('[Scan Emails Push] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Gmail push scan endpoint',
    status: 'operational',
  });
}
