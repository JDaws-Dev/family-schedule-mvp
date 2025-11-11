import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Cron job to renew Gmail push notification watches
 *
 * Gmail watches expire after 7 days, so we need to renew them regularly.
 * This cron should run daily to ensure watches stay active.
 *
 * Setup in Vercel:
 * Add cron schedule: 0 2 * * * (runs daily at 2 AM)
 */

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Renew Watches] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Renew Watches] Starting daily watch renewal...');

    // Get all families
    const families = await convex.query(api.families.getAllFamilies);
    console.log(`[Renew Watches] Found ${families?.length || 0} families`);

    let totalAccounts = 0;
    let renewedCount = 0;
    let errorCount = 0;

    // For each family, get their Gmail accounts and renew watches
    for (const family of families || []) {
      try {
        const gmailAccounts = await convex.query(api.gmailAccounts.getFamilyGmailAccounts, {
          familyId: family._id,
        });

        console.log(`[Renew Watches] Family ${family._id}: ${gmailAccounts?.length || 0} Gmail accounts`);

        for (const account of gmailAccounts || []) {
          totalAccounts++;

          // Only renew active accounts
          if (!account.isActive) {
            console.log(`[Renew Watches] Skipping inactive account: ${account.gmailEmail}`);
            continue;
          }

          try {
            // Call the gmail-watch endpoint to renew the watch
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
            const watchResponse = await fetch(`${appUrl}/api/gmail-watch`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accountId: account._id }),
            });

            const watchData = await watchResponse.json();

            if (watchResponse.ok) {
              console.log(`[Renew Watches] ✓ Renewed watch for ${account.gmailEmail}`);
              renewedCount++;
            } else {
              console.error(`[Renew Watches] ✗ Failed to renew watch for ${account.gmailEmail}:`, watchData);
              errorCount++;
            }
          } catch (error) {
            console.error(`[Renew Watches] Error renewing watch for ${account.gmailEmail}:`, error);
            errorCount++;
          }
        }
      } catch (error) {
        console.error(`[Renew Watches] Error processing family ${family._id}:`, error);
      }
    }

    console.log('[Renew Watches] Daily renewal complete:', {
      totalAccounts,
      renewedCount,
      errorCount,
    });

    return NextResponse.json({
      success: true,
      message: 'Watch renewal complete',
      totalAccounts,
      renewedCount,
      errorCount,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Renew Watches] Cron job failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to renew watches',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
