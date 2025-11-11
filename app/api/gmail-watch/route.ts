import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Set up Gmail push notifications for an account
 * This creates a "watch" that tells Gmail to send notifications to our webhook
 *
 * Required environment variables:
 * - GOOGLE_PUBSUB_TOPIC: Full Pub/Sub topic path (projects/PROJECT_ID/topics/TOPIC_NAME)
 */

export async function POST(request: NextRequest) {
  // Declare gmailAccount outside try block so it's accessible in catch block for retry logic
  let gmailAccount: any = null;

  try {
    const { accountId, skipRetryCheck } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get Gmail account from database
    gmailAccount = await convex.query(api.gmailAccounts.getGmailAccountById, {
      accountId: accountId as Id<"gmailAccounts">,
    });

    if (!gmailAccount) {
      return NextResponse.json(
        { error: 'Gmail account not found' },
        { status: 404 }
      );
    }

    // Check if we're in retry backoff period (unless explicitly skipping check)
    if (!skipRetryCheck && gmailAccount.gmailPushNextRetry) {
      const now = Date.now();
      if (gmailAccount.gmailPushNextRetry > now) {
        const waitMinutes = Math.ceil((gmailAccount.gmailPushNextRetry - now) / 60000);
        console.log(`[Gmail Watch] Account in retry backoff, retry in ${waitMinutes} minutes`);
        return NextResponse.json({
          error: 'Too many failed attempts',
          retryAfter: gmailAccount.gmailPushNextRetry,
          retryInMinutes: waitMinutes,
          message: `Please wait ${waitMinutes} minutes before retrying`
        }, { status: 429 });
      }
    }

    // Set up OAuth2 client (redirect_uri not needed for token refresh)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: gmailAccount.accessToken,
      refresh_token: gmailAccount.refreshToken,
    });

    // Refresh token if needed
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (credentials.access_token && credentials.refresh_token) {
      await convex.mutation(api.gmailAccounts.updateGmailTokens, {
        accountId: gmailAccount._id,
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token,
      });
      oauth2Client.setCredentials(credentials);
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Check if PUBSUB_TOPIC is configured
    const pubsubTopic = process.env.GOOGLE_PUBSUB_TOPIC;
    if (!pubsubTopic) {
      return NextResponse.json(
        {
          error: 'Google Cloud Pub/Sub topic not configured',
          setup: 'Please set GOOGLE_PUBSUB_TOPIC environment variable',
          instructions: 'See /docs/PUSH_NOTIFICATIONS_SETUP.md for details'
        },
        { status: 500 }
      );
    }

    console.log('[Gmail Watch] Setting up watch for:', gmailAccount.gmailEmail);
    console.log('[Gmail Watch] Using Pub/Sub topic:', pubsubTopic);

    // Set up the watch (Gmail push notification)
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: pubsubTopic,
        labelIds: ['INBOX'], // Only watch INBOX
      },
    });

    const expirationMs = parseInt(watchResponse.data.expiration || '0');
    const expirationDate = new Date(expirationMs);

    console.log('[Gmail Watch] Watch set up successfully:', {
      email: gmailAccount.gmailEmail,
      historyId: watchResponse.data.historyId,
      expiration: expirationDate.toISOString(),
    });

    // Store the watch information in database
    try {
      await convex.mutation(api.gmailAccounts.updatePushStatus, {
        accountId: gmailAccount._id,
        enabled: true,
        channelId: 'gmail-watch-' + gmailAccount._id, // Use account ID as channel identifier
        historyId: watchResponse.data.historyId,
        expiration: expirationMs,
        // Success! Reset retry count and clear any retry backoff
        retryCount: 0,
        nextRetry: undefined,
      });
      console.log('[Gmail Watch] Push status updated in database');
    } catch (dbError) {
      console.error('[Gmail Watch] Failed to update database:', dbError);
      // Don't fail the whole request, watch is still active
    }

    return NextResponse.json({
      success: true,
      email: gmailAccount.gmailEmail,
      historyId: watchResponse.data.historyId,
      expiration: expirationDate.toISOString(),
      expiresIn: `${Math.round((expirationMs - Date.now()) / (1000 * 60 * 60 * 24))} days`,
    });

  } catch (error: any) {
    console.error('[Gmail Watch] Error:', error);

    // Only implement retry logic if we have a gmailAccount (error occurred after loading account)
    if (gmailAccount) {
      // Calculate retry backoff
      const currentRetryCount = gmailAccount.gmailPushRetryCount || 0;
      const nextRetryCount = currentRetryCount + 1;
      const MAX_RETRIES = 5;

      // Exponential backoff: 2^retryCount minutes (1, 2, 4, 8, 16 min), capped at 60 min
      const backoffMinutes = Math.min(Math.pow(2, nextRetryCount), 60);
      const nextRetryTime = Date.now() + (backoffMinutes * 60 * 1000);

      // Store error and retry metadata in database
      try {
        await convex.mutation(api.gmailAccounts.updatePushStatus, {
          accountId: gmailAccount._id,
          enabled: false,
          error: error.message,
          retryCount: nextRetryCount,
          nextRetry: nextRetryCount < MAX_RETRIES ? nextRetryTime : undefined,
        });
        console.log(`[Gmail Watch] Retry ${nextRetryCount}/${MAX_RETRIES}, next retry in ${backoffMinutes} minutes`);
      } catch (dbError) {
        console.error('[Gmail Watch] Failed to update retry metadata:', dbError);
      }
    }

    // Provide helpful error messages
    if (error.code === 400 && error.message?.includes('topicName')) {
      const response: any = {
        error: 'Invalid Pub/Sub topic configuration',
        details: error.message,
        instructions: 'Check GOOGLE_PUBSUB_TOPIC environment variable format (projects/PROJECT_ID/topics/TOPIC_NAME)',
      };

      if (gmailAccount) {
        const currentRetryCount = gmailAccount.gmailPushRetryCount || 0;
        const nextRetryCount = currentRetryCount + 1;
        const MAX_RETRIES = 5;
        const backoffMinutes = Math.min(Math.pow(2, nextRetryCount), 60);
        response.retryCount = nextRetryCount;
        response.maxRetries = MAX_RETRIES;
        response.nextRetryIn = nextRetryCount < MAX_RETRIES ? `${backoffMinutes} minutes` : 'No more retries';
      }

      return NextResponse.json(response, { status: 500 });
    }

    if (error.code === 403) {
      const response: any = {
        error: 'Permission denied - Gmail API cannot publish to Pub/Sub topic',
        instructions: 'Grant gmail-api-push@system.gserviceaccount.com publish permission on your Pub/Sub topic',
        docs: 'https://developers.google.com/gmail/api/guides/push',
      };

      if (gmailAccount) {
        const currentRetryCount = gmailAccount.gmailPushRetryCount || 0;
        const nextRetryCount = currentRetryCount + 1;
        const MAX_RETRIES = 5;
        const backoffMinutes = Math.min(Math.pow(2, nextRetryCount), 60);
        response.retryCount = nextRetryCount;
        response.maxRetries = MAX_RETRIES;
        response.nextRetryIn = nextRetryCount < MAX_RETRIES ? `${backoffMinutes} minutes` : 'No more retries';
      }

      return NextResponse.json(response, { status: 500 });
    }

    const response: any = {
      error: 'Failed to set up Gmail push notifications',
      details: error.message,
      code: error.code,
    };

    if (gmailAccount) {
      const currentRetryCount = gmailAccount.gmailPushRetryCount || 0;
      const nextRetryCount = currentRetryCount + 1;
      const MAX_RETRIES = 5;
      const backoffMinutes = Math.min(Math.pow(2, nextRetryCount), 60);
      response.retryCount = nextRetryCount;
      response.maxRetries = MAX_RETRIES;
      response.nextRetryIn = nextRetryCount < MAX_RETRIES ? `${backoffMinutes} minutes` : 'No more retries';
    }

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * Get status of Gmail watches
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Gmail Watch Management',
    status: 'operational',
    endpoints: {
      POST: 'Set up push notifications for a Gmail account',
      GET: 'Get watch status (this endpoint)',
    },
    requirements: [
      'GOOGLE_PUBSUB_TOPIC environment variable',
      'Gmail API publish permission on Pub/Sub topic',
      'Pub/Sub subscription pointing to /api/gmail-webhook'
    ]
  });
}
