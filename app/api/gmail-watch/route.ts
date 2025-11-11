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
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get Gmail account from database
    const gmailAccount = await convex.query(api.gmailAccounts.getGmailAccountById, {
      accountId: accountId as Id<"gmailAccounts">,
    });

    if (!gmailAccount) {
      return NextResponse.json(
        { error: 'Gmail account not found' },
        { status: 404 }
      );
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

    console.log('[Gmail Watch] Watch set up successfully:', {
      email: gmailAccount.gmailEmail,
      historyId: watchResponse.data.historyId,
      expiration: watchResponse.data.expiration,
    });

    // Store the watch information
    // Note: Watch expires after 7 days, need to renew
    const expirationMs = parseInt(watchResponse.data.expiration || '0');
    const expirationDate = new Date(expirationMs);

    return NextResponse.json({
      success: true,
      email: gmailAccount.gmailEmail,
      historyId: watchResponse.data.historyId,
      expiration: expirationDate.toISOString(),
      expiresIn: `${Math.round((expirationMs - Date.now()) / (1000 * 60 * 60 * 24))} days`,
    });

  } catch (error: any) {
    console.error('[Gmail Watch] Error:', error);

    // Provide helpful error messages
    if (error.code === 400 && error.message?.includes('topicName')) {
      return NextResponse.json({
        error: 'Invalid Pub/Sub topic configuration',
        details: error.message,
        instructions: 'Check GOOGLE_PUBSUB_TOPIC environment variable format (projects/PROJECT_ID/topics/TOPIC_NAME)'
      }, { status: 500 });
    }

    if (error.code === 403) {
      return NextResponse.json({
        error: 'Permission denied - Gmail API cannot publish to Pub/Sub topic',
        instructions: 'Grant gmail-api-push@system.gserviceaccount.com publish permission on your Pub/Sub topic',
        docs: 'https://developers.google.com/gmail/api/guides/push'
      }, { status: 500 });
    }

    return NextResponse.json(
      {
        error: 'Failed to set up Gmail push notifications',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
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
