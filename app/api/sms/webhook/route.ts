import { NextRequest, NextResponse } from 'next/server';

/**
 * Twilio SMS Webhook Handler
 * Automatically processes incoming text messages and extracts event information
 *
 * Twilio sends POST requests with the following parameters:
 * - From: Phone number that sent the message
 * - Body: The text message content
 * - To: Your Twilio phone number
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const to = formData.get('To') as string;

    console.log('[SMS Webhook] Received message from:', from);
    console.log('[SMS Webhook] Message body:', body);

    // TODO: Look up user by phone number
    // For now, we'll extract the event and return success

    // Use OpenAI to extract event information from SMS
    const systemPrompt = `You are an AI assistant that extracts event information from text messages.

Analyze the following text message and extract any event details you can find.

Return a JSON object with this structure:
{
  "hasEvent": true/false,
  "event": {
    "title": "Event name",
    "description": "Event description",
    "date": "YYYY-MM-DD (if you can determine it)",
    "time": "HH:MM in 24-hour format (if mentioned)",
    "endTime": "HH:MM (if mentioned)",
    "location": "Location name or address",
    "category": "sports" | "arts" | "education" | "entertainment" | "family" | "other",
    "requiresAction": true/false (if RSVP or registration needed),
    "actionDeadline": "YYYY-MM-DD (if RSVP deadline mentioned)"
  }
}

If the message doesn't contain event information, set hasEvent to false.

Current date context: ${new Date().toISOString().split('T')[0]}

When parsing dates:
- "tomorrow" = add 1 day to current date
- "next week" = add 7 days
- Day names (Monday, Tuesday, etc) = find the next occurrence
- Month/day with no year = use current year if in future, otherwise next year`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract event information from this text message:\n\n${body}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('[SMS Webhook] OpenAI API error:', await openaiResponse.text());
      // Return success to Twilio even if processing fails
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const result = JSON.parse(openaiData.choices[0].message.content);

    console.log('[SMS Webhook] Extracted event:', result);

    if (result.hasEvent && result.event) {
      // TODO: Save event to database
      // For now, just log it
      console.log('[SMS Webhook] Event detected:', result.event);

      // Send confirmation reply (optional)
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Event detected: "${result.event.title || 'Untitled'}"${result.event.date ? ` on ${result.event.date}` : ''}. We'll add it to your calendar!</Message>
</Response>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // No event found, send empty response
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  } catch (error: any) {
    console.error('[SMS Webhook] Error processing SMS:', error);

    // Always return 200 to Twilio to prevent retries
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}

/**
 * GET endpoint for webhook verification
 */
export async function GET() {
  return NextResponse.json({
    message: 'SMS webhook endpoint',
    status: 'operational',
    instructions: 'Configure this URL as your Twilio SMS webhook',
  });
}
