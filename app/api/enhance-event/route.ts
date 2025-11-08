import { NextRequest, NextResponse } from 'next/server';

/**
 * Enhance event details with AI
 * Takes basic event info and returns enhanced title and description
 */
export async function POST(request: NextRequest) {
  try {
    const { title, category, location, time, childName } = await request.json();

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please provide an event title to enhance' },
        { status: 400 }
      );
    }

    // Build context for AI
    const contextParts = [];
    if (category) contextParts.push(`Category: ${category}`);
    if (location) contextParts.push(`Location: ${location}`);
    if (time) contextParts.push(`Time: ${time}`);
    if (childName) contextParts.push(`For: ${childName}`);
    const context = contextParts.length > 0 ? `\n\nContext:\n${contextParts.join('\n')}` : '';

    const systemPrompt = `You are a helpful assistant that enhances event details for busy families.

Given a basic event title and optional context, you should:

1. **Enhanced Title**: Create a clear, descriptive title if the original is vague or too short. If the original title is already good, keep it or make minor improvements.

2. **Description**: Generate a helpful, practical description that includes:
   - What to expect at the event
   - What to bring (if applicable based on category)
   - Dress code or attire suggestions (if applicable)
   - Any typical preparation needed
   - Helpful tips or reminders

Keep descriptions concise (2-4 sentences) and practical. Focus on actionable information that helps families prepare.

Examples:

Input: "soccer"
Output:
{
  "enhancedTitle": "Youth Soccer Practice",
  "description": "Bring cleats, shin guards, and water bottle. Wear athletic clothing and arrive 10 minutes early for warm-ups."
}

Input: "dentist"
Output:
{
  "enhancedTitle": "Dental Checkup",
  "description": "Regular dental cleaning and examination. Arrive 10 minutes early to fill out any updated forms. Brush teeth before appointment."
}

Input: "Emma's birthday party"
Output:
{
  "enhancedTitle": "Emma's Birthday Party",
  "description": "Don't forget to bring a wrapped gift! Check if there's a theme for dress-up. RSVP if you haven't already."
}

Input: "dance class"
Output:
{
  "enhancedTitle": "Dance Class",
  "description": "Wear comfortable dance attire and bring ballet/tap shoes. Hair should be pulled back. Arrive 5 minutes early to get ready."
}

Return a JSON object with this structure:
{
  "enhancedTitle": "Improved title",
  "description": "Practical, helpful description with preparation tips"
}

IMPORTANT:
- DO NOT mention the category name or family member names in the description as they are already shown separately
- Focus on practical preparation and what to bring
- Keep it concise and actionable`;

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
            content: `Enhance this event:

Title: "${title}"${context}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('[Enhance Event] OpenAI API error:', await openaiResponse.text());
      return NextResponse.json(
        { error: 'Failed to enhance event details' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const result = JSON.parse(openaiData.choices[0].message.content);

    console.log('[Enhance Event] Result:', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[Enhance Event] Error:', error);
    return NextResponse.json(
      { error: 'Failed to enhance event details', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for status check
 */
export async function GET() {
  return NextResponse.json({
    message: 'Event enhancement endpoint',
    status: 'operational',
    instructions: 'POST with JSON containing event details to enhance',
  });
}
