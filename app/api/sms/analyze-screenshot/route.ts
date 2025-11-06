import { NextRequest, NextResponse } from 'next/server';

/**
 * Analyze SMS screenshot using GPT-4 Vision
 * Extracts event information from uploaded images of text conversations
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Please provide an image file' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Determine image type
    const imageType = imageFile.type || 'image/png';

    console.log('[SMS Screenshot] Analyzing image:', imageFile.name, imageType, `${Math.round(bytes.byteLength / 1024)}KB`);

    // Use OpenAI GPT-4 Vision to analyze the screenshot
    const systemPrompt = `You are an AI assistant that extracts event information from screenshots of text messages.

Analyze the provided screenshot of a text message conversation and extract any event details you can find.

Return a JSON object with this structure:
{
  "hasEvent": true/false,
  "events": [
    {
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
      "ageRange": "age range if mentioned",
      "phoneNumber": "contact phone if mentioned",
      "website": "URL if mentioned"
    }
  ],
  "confidence": "high" | "medium" | "low",
  "explanation": "Brief explanation of what you found in the screenshot"
}

If the screenshot doesn't contain event information, set hasEvent to false and explain why.
If you find multiple events in the conversation, include all of them in the events array.

Current date context: ${new Date().toISOString().split('T')[0]}

When parsing dates:
- "tomorrow" = add 1 day to current date
- "next week" = add 7 days
- Day names (Monday, Tuesday, etc) = find the next occurrence
- Month/day with no year = use current year if in future, otherwise next year
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // gpt-4o-mini supports vision
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: systemPrompt + '\n\nPlease analyze this screenshot and extract any event information:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageType};base64,${base64Image}`,
                  detail: 'high', // Use high detail for better text recognition
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[SMS Screenshot] OpenAI API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to analyze screenshot', details: errorText },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const result = JSON.parse(openaiData.choices[0].message.content);

    console.log('[SMS Screenshot] Result:', result);
    console.log('[SMS Screenshot] Tokens used:', openaiData.usage);

    return NextResponse.json({
      success: true,
      ...result,
      usage: openaiData.usage, // Return token usage for cost estimation
    });
  } catch (error: any) {
    console.error('[SMS Screenshot] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze screenshot', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for status check
 */
export async function GET() {
  return NextResponse.json({
    message: 'SMS screenshot analysis endpoint',
    status: 'operational',
    instructions: 'POST with multipart/form-data containing "image" file',
    supportedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    estimatedCost: '~$0.01 per screenshot (using GPT-4 Vision)',
  });
}
