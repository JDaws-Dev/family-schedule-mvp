import { NextRequest, NextResponse } from 'next/server';

/**
 * Enhance event details with AI
 * Takes basic event info and returns enhanced title and description
 */
export async function POST(request: NextRequest) {
  try {
    const { title, category, location, time, childName, familyMembers } = await request.json();

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please provide an event title to enhance' },
        { status: 400 }
      );
    }

    // Build context for AI
    const contextParts = [];
    if (category) contextParts.push(`Current Category: ${category}`);
    if (location) contextParts.push(`Location: ${location}`);
    if (time) contextParts.push(`Time: ${time}`);
    if (childName) contextParts.push(`Currently marked for: ${childName}`);
    if (familyMembers && familyMembers.length > 0) {
      contextParts.push(`Family Members: ${familyMembers.map((m: any) => m.name).join(', ')}`);
    }
    const context = contextParts.length > 0 ? `\n\nContext:\n${contextParts.join('\n')}` : '';

    const systemPrompt = `You are a helpful assistant that creates personal family calendar reminders.

IMPORTANT: These are reminders for the FAMILY THEMSELVES about what they're doing. Think of it as notes to your future self, NOT formal invitations or instructions to others.

Given a basic event title and optional context, you should:

1. **Enhanced Title**: Create a clear, descriptive title if the original is vague or too short. If the original title is already good, keep it or make minor improvements.

2. **Description**: Generate a casual, helpful reminder note that includes:
   - Quick context about what this is
   - What to remember to bring (if applicable)
   - What to wear or prepare (if applicable)
   - Any helpful notes for future reference

Keep descriptions concise (2-4 sentences), casual, and personal. Write like you're leaving a note for yourself or your family.

Examples:

Input: "soccer"
Output:
{
  "enhancedTitle": "Soccer Practice",
  "description": "Remember to bring cleats, shin guards, and water. Kids should wear athletic clothes. Try to arrive 10 minutes early for warm-ups."
}

Input: "dentist"
Output:
{
  "enhancedTitle": "Dentist Appointment",
  "description": "Regular cleaning and checkup. Get there a few minutes early for paperwork. Good idea to brush teeth beforehand."
}

Input: "Emma's birthday party"
Output:
{
  "enhancedTitle": "Emma's Birthday Party",
  "description": "Need to bring a wrapped gift. Check if there's a dress-up theme. Remember to RSVP if we haven't already."
}

Input: "dance class"
Output:
{
  "enhancedTitle": "Dance Class",
  "description": "Wear dance clothes and bring ballet/tap shoes. Hair should be pulled back. Arrive a few minutes early to get settled."
}

Return a JSON object with this structure:
{
  "enhancedTitle": "Improved title",
  "description": "Practical, helpful reminder note",
  "category": "Best matching category from this list: Soccer, Basketball, Football, Baseball, Swimming, Dance, Gymnastics, Martial Arts, Music Lessons, Art, Theater, Tutoring, School Event, Playdate, Birthday Party, Doctor Appointment, Religious, Social, Family Event, Other",
  "attendees": ["Array of family member names who would typically attend this type of event based on context"],
  "isRecurring": true/false,
  "recurrencePattern": "weekly" | "daily" | "monthly" (if recurring),
  "recurrenceDaysOfWeek": ["Monday", "Tuesday", etc.] (if weekly recurring),
  "requiresAction": true/false,
  "actionDescription": "What action might be needed (e.g., 'Remember to RSVP', 'Payment due')"
}

CATEGORY SELECTION:
- Choose the MOST SPECIFIC category that matches
- Soccer practice → "Soccer" (not "Sports")
- Piano lessons → "Music Lessons" (not "Other")
- Dentist → "Doctor Appointment"
- Only use "Other" if truly doesn't fit

ATTENDEE DETECTION:
- If title mentions a child's name and it matches a family member, include them
- For activities like "soccer practice", "dance class" - likely the child
- For "dentist", "doctor" - could be anyone, use context
- For "family dinner" - include all family members
- For "parent-teacher conference" - likely just parents

RECURRING DETECTION:
- Look for words like "practice", "class", "lesson" which are typically weekly
- "Monthly" events → recurrencePattern: "monthly"
- "Every Tuesday" → isRecurring: true, recurrencePattern: "weekly", recurrenceDaysOfWeek: ["Tuesday"]

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
