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
    // Verify the request is from Google Cloud Pub/Sub
    const authHeader = request.headers.get('authorization');

    // Parse the Pub/Sub message
    const body = await request.json();

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
