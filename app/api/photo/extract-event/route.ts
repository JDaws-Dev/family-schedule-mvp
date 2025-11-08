import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract event information from uploaded photo
 * Uses OpenAI Vision API to intelligently parse event details from images like flyers, schedules, invitations
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File;

    if (!photo) {
      return NextResponse.json(
        { error: 'Please provide a photo to analyze' },
        { status: 400 }
      );
    }

    // Convert image to base64 for OpenAI Vision API
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const mimeType = photo.type || 'image/jpeg';

    // Use OpenAI Vision to extract text and event information from photo
    const systemPrompt = `You are an AI assistant that extracts event information from photos of flyers, schedules, invitations, and event announcements.

Analyze the image and extract ALL event details you can find. If there are multiple events shown (like a monthly schedule or list of activities), extract each one separately.

Return a JSON object with this structure:
{
  "hasEvents": true/false,
  "events": [
    {
      "title": "Event name",
      "description": "Event description",
      "date": "YYYY-MM-DD (if you can determine it)",
      "time": "HH:MM in 24-hour format (if mentioned)",
      "endTime": "HH:MM (if mentioned)",
      "location": "Location name or address",
      "category": "A descriptive category name (e.g., 'Sports', 'Music Lessons', 'Birthday Party', 'Doctor Appointment', 'School Event', 'Dance', 'Soccer', etc.)",
      "childName": "Name of child/person event is for if mentioned",
      "requiresAction": true/false (if RSVP or registration needed),
      "actionDeadline": "YYYY-MM-DD (if RSVP deadline mentioned)",
      "actionDescription": "What action is needed (e.g., 'RSVP by email', 'Pay $50')",
      "priceRange": "Free" | "$" | "$$" | "$$$" (if cost mentioned)",
      "ageRange": "age range if mentioned (e.g., '5-12 years')",
      "phoneNumber": "contact phone if mentioned",
      "website": "URL if mentioned"
    }
  ],
  "confidence": "high" | "medium" | "low",
  "explanation": "Brief explanation of what you extracted and why"
}

If the image doesn't contain event information, set hasEvents to false and return an empty events array.
IMPORTANT: If multiple events are shown (e.g., a weekly schedule showing different activities each day), create separate event objects for each one.

IMPORTANT CONTEXT - Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Current date: ${new Date().toISOString().split('T')[0]}
Current day of week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}

When parsing dates:
- Look for explicit dates (MM/DD/YYYY, Month Day, etc.)
- "this [day of week]" = the NEXT occurrence of that day
- "next [day of week]" = the occurrence of that day in the following week
- If only month/day visible with no year, use current year if date is in future, otherwise next year
- For schedules showing recurring events (e.g., "Every Monday"), pick the next occurrence

IMPORTANT - Category Guidelines:
Create descriptive, specific category names that help families organize their events. BE VERY SPECIFIC:

SPORTS & ACTIVITIES:
- Basketball → "Basketball"
- Soccer → "Soccer"
- Football → "Football"
- Baseball/softball → "Baseball"
- Swimming → "Swimming"
- Dance → "Dance"
- Gymnastics → "Gymnastics"
- Martial arts → "Martial Arts"

ARTS & EDUCATION:
- Music lessons → "Music Lessons"
- Art class → "Art"
- Theater → "Theater"
- Tutoring → "Tutoring"
- School events → "School Event"

SOCIAL & FAMILY:
- Dinners, lunches → "Social"
- Playdates → "Playdate"
- Birthday parties → "Birthday Party"
- Family gatherings → "Family Event"

HEALTH:
- Doctor/dentist → "Doctor Appointment"

RELIGIOUS:
- Church, religious events → "Religious"

Use "Other" only if truly doesn't fit any category.

Examples of photos you might see:
- Soccer team schedule with multiple game dates and times
- Birthday party invitation with date, time, location
- School flyer for parent-teacher conferences
- Dance recital announcement
- Summer camp registration form

Be thorough - read all text in the image carefully and extract every piece of relevant information.
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
            content: [
              {
                type: 'text',
                text: 'Extract all event information from this image:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('[Photo Extract] OpenAI API error:', await openaiResponse.text());
      return NextResponse.json(
        { error: 'Failed to analyze photo' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const result = JSON.parse(openaiData.choices[0].message.content);

    console.log('[Photo Extract] Result:', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[Photo Extract] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract event information from photo', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for status check
 */
export async function GET() {
  return NextResponse.json({
    message: 'Photo event extraction endpoint',
    status: 'operational',
    instructions: 'POST with FormData containing "photo" file',
  });
}
