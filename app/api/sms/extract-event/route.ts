import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract event information from pasted SMS text
 * Uses OpenAI to intelligently parse event details from any text format
 */
export async function POST(request: NextRequest) {
  try {
    const { smsText } = await request.json();

    if (!smsText || smsText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please provide SMS text to analyze' },
        { status: 400 }
      );
    }

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
    "actionDeadline": "YYYY-MM-DD (if RSVP deadline mentioned)",
    "priceRange": "Free" | "$" | "$$" | "$$$" (if cost mentioned),
    "ageRange": "age range if mentioned (e.g., '5-12 years')",
    "phoneNumber": "contact phone if mentioned",
    "website": "URL if mentioned"
  },
  "confidence": "high" | "medium" | "low",
  "explanation": "Brief explanation of what you extracted and why"
}

If the message doesn't contain event information, set hasEvent to false and explain why.

Current date context: ${new Date().toISOString().split('T')[0]}

When parsing dates:
- "tomorrow" = add 1 day to current date
- "next week" = add 7 days
- Day names (Monday, Tuesday, etc) = find the next occurrence
- Month/day with no year = use current year if in future, otherwise next year
- Be smart about relative dates like "this Saturday" or "next Friday"

Examples:
- "Soccer practice Saturday at 9am at City Park" → Extract: title="Soccer Practice", date=(next Saturday), time="09:00", location="City Park", category="sports"
- "Don't forget - Emily's birthday party next Sunday 2pm at Chuck E Cheese!" → Extract: title="Emily's Birthday Party", category="family", date=(next Sunday), time="14:00", location="Chuck E Cheese"
- "Parent-teacher conferences Nov 15-17, sign up at www.school.com" → Extract multiple events or one with date range
`;

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
          {
            role: 'user',
            content: `Extract event information from this text message:

${smsText}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('[SMS Extract] OpenAI API error:', await openaiResponse.text());
      return NextResponse.json(
        { error: 'Failed to analyze text message' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const result = JSON.parse(openaiData.choices[0].message.content);

    console.log('[SMS Extract] Result:', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[SMS Extract] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract event information', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for status check
 */
export async function GET() {
  return NextResponse.json({
    message: 'SMS event extraction endpoint',
    status: 'operational',
    instructions: 'POST with { "smsText": "your text message here" }',
  });
}
