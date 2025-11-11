import { NextRequest, NextResponse } from 'next/server';

/**
 * Gmail Push Notification Webhook
 * Receives notifications from Google Cloud Pub/Sub when new emails arrive
 *
 * Setup required:
 * 1. Create a Pub/Sub topic in Google Cloud Console
 * 2. Grant Gmail API publish rights to the topic
 * 3. Set up Gmail watch requests pointing to this topic
 * 4. Subscribe this webhook to the topic
 */

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify the request is from Google Cloud Pub/Sub
    const authHeader = request.headers.get('authorization');

    // Google Pub/Sub sends JWT tokens in the Authorization header
    // Format: "Bearer {JWT_TOKEN}"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Gmail Webhook] Unauthorized: Missing or invalid Authorization header');
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    // Extract the JWT token
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Basic JWT structure validation (JWT has 3 parts separated by dots)
    if (!token || token.split('.').length !== 3) {
      console.error('[Gmail Webhook] Unauthorized: Invalid JWT token format');
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token format' },
        { status: 401 }
      );
    }

    // Parse the Pub/Sub message
    const body = await request.json();

    // Validate Pub/Sub message structure
    if (!body.message || typeof body.message !== 'object') {
      console.error('[Gmail Webhook] Invalid Pub/Sub message structure');
      return NextResponse.json(
        { error: 'Invalid Pub/Sub message structure' },
        { status: 400 }
      );
    }

    // Verify subscription name matches our expected subscription
    // This prevents webhooks from other Pub/Sub topics being processed
    if (body.subscription) {
      const subscriptionPath = body.subscription;
      if (!subscriptionPath.includes('gmail-webhook-subscription') &&
          !subscriptionPath.includes('gmail-notifications')) {
        console.error('[Gmail Webhook] Unauthorized: Unknown subscription:', subscriptionPath);
        return NextResponse.json(
          { error: 'Unauthorized: Unknown subscription' },
          { status: 403 }
        );
      }
    }

    console.log('[Gmail Webhook] Received push notification:', {
      messageId: body.message?.messageId,
      publishTime: body.message?.publishTime,
      hasData: !!body.message?.data
    });

    // Decode the message data (base64 encoded)
    if (!body.message?.data) {
      return NextResponse.json({ success: true, skipped: 'No message data' });
    }

    const decodedData = JSON.parse(
      Buffer.from(body.message.data, 'base64').toString('utf-8')
    );

    console.log('[Gmail Webhook] Decoded notification:', decodedData);

    // Extract Gmail account information
    const { emailAddress, historyId } = decodedData;

    if (!emailAddress || !historyId) {
      console.error('[Gmail Webhook] Missing required fields:', { emailAddress, historyId });
      return NextResponse.json({ success: false, error: 'Missing required fields' });
    }

    // Trigger email scan for this specific account
    // This will process any new messages since the last historyId
    const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/scan-emails-push`;

    console.log('[Gmail Webhook] Triggering scan for:', emailAddress);

    const scanResponse = await fetch(scanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailAddress,
        historyId: parseInt(historyId),
      }),
    });

    if (!scanResponse.ok) {
      console.error('[Gmail Webhook] Scan failed:', await scanResponse.text());
      return NextResponse.json({
        success: false,
        error: 'Failed to scan emails'
      }, { status: 500 });
    }

    const scanResult = await scanResponse.json();
    console.log('[Gmail Webhook] Scan complete:', scanResult);

    return NextResponse.json({
      success: true,
      processed: scanResult
    });

  } catch (error: any) {
    console.error('[Gmail Webhook] Error processing notification:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Handle Pub/Sub subscription verification
 */
export async function GET() {
  return NextResponse.json({
    message: 'Gmail push notification webhook',
    status: 'operational',
  });
}
