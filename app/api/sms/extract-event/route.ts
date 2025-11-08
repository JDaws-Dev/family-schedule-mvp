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

Analyze the following text and extract ALL event details you can find. If there are multiple events mentioned, extract each one separately.

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
      "childName": "Name of child/person event is for (e.g., 'Emma', 'Sarah'). If multiple people mentioned, separate with ', '",
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

If the message doesn't contain event information, set hasEvents to false and return an empty events array.
IMPORTANT: If multiple events are mentioned (e.g., "Soccer on Monday and dance class on Wednesday"), create separate event objects for each one.

IMPORTANT CONTEXT - Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Current date: ${new Date().toISOString().split('T')[0]}
Current day of week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}

When parsing dates:
- "tomorrow" = add 1 day to current date
- "next week" = add 7 days
- "this [day of week]" = the NEXT occurrence of that day in the current week (if it hasn't passed) OR next week (if it has passed)
  Example: If today is Wednesday and text says "this Friday", that means the Friday coming up in 2 days
  Example: If today is Wednesday and text says "this Monday", that means next Monday (5 days away)
- "next [day of week]" = the occurrence of that day in the following week (7+ days away)
- Day names alone (Monday, Tuesday, etc) = find the next occurrence from today
- Month/day with no year = use current year if in future, otherwise next year
- Be very careful with "this" vs "next" - "this Friday" means the upcoming Friday in the current week cycle

IMPORTANT - Category Guidelines:
Create descriptive, specific category names that help families organize their events. BE VERY SPECIFIC about the category:

SPORTS & ACTIVITIES:
- Basketball game/practice → "Basketball"
- Soccer game/practice → "Soccer"
- Football game/practice → "Football"
- Baseball/softball → "Baseball"
- Swimming → "Swimming"
- Dance class/recital/performance → "Dance"
- Gymnastics → "Gymnastics"
- Karate/martial arts → "Martial Arts"
- Generic sports → "Sports"

ARTS & EDUCATION:
- Piano/guitar/music lessons → "Music Lessons"
- Art class → "Art"
- Theater/drama → "Theater"
- Tutoring → "Tutoring"
- School events/conferences → "School Event"

SOCIAL & FAMILY:
- Dinners, lunches, breakfasts with friends/family → "Social"
- Playdates → "Playdate"
- Birthday parties → "Birthday Party"
- Family gatherings → "Family Event"

HEALTH & APPOINTMENTS:
- Doctor, dentist, medical appointments → "Doctor Appointment"

RELIGIOUS & COMMUNITY:
- Church, temple, religious events → "Religious"
- Men's/women's groups, bible studies → "Religious"
- Community service → "Community"

OTHER:
- Only use "Other" if the event truly doesn't fit any category above

Rules:
- Use Title Case (e.g., "Soccer Practice", "Piano Lessons", "Birthday Party")
- Keep categories concise (1-3 words max)
- Be SPECIFIC - "Basketball" not "Sports", "Dance" not "Other", "Social" not "Other"

IMPORTANT - Extract Names:
- If the text mentions a specific child's name (e.g., "Emma's soccer practice" or "dance class for Sarah"), extract that name in the childName field
- Look for possessive forms ("Emma's", "Sarah's") or "for [name]" patterns
- If multiple children are mentioned for the same event, separate names with ", " (e.g., "Emma, Sarah")

Examples:
- "Soccer practice Saturday at 9am at City Park" → title="Soccer Practice", date=(next Saturday), time="09:00", location="City Park", category="Soccer"
- "Basketball game tonight at 6pm" → title="Basketball Game", category="Basketball", time="18:00"
- "Dance recital Friday 5pm" → title="Dance Recital", category="Dance", time="17:00"
- "Dinner at Lee's house Saturday 7pm" → title="Dinner at Lee's House", category="Social", time="19:00", location="Lee's house"
- "Men's breakfast this Sunday at 8am" → title="Men's Breakfast", category="Religious", time="08:00"
- "Don't forget - Emily's birthday party next Sunday 2pm at Chuck E Cheese!" → title="Birthday Party", childName="Emily", category="Birthday Party", date=(next Sunday), time="14:00", location="Chuck E Cheese"
- "Parent-teacher conferences Nov 15-17, sign up at www.school.com" → category="School Event", requiresAction=true, actionDescription="Sign up at www.school.com"
- "Emma's piano lesson Monday at 4pm" → title="Piano Lesson", childName="Emma", category="Music Lessons", time="16:00"
- "Basketball practice for Jake and Emma Wednesday at 6pm" → title="Basketball Practice", childName="Jake, Emma", category="Basketball", time="18:00"
- "Dentist appointment for Sarah Thursday at 2:30pm" → title="Dentist Appointment", childName="Sarah", category="Doctor Appointment", time="14:30"
- "Lunch with the Smiths tomorrow at noon" → title="Lunch with the Smiths", category="Social", time="12:00"
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
