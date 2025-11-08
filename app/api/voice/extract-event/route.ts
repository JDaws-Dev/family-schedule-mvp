import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract event information from voice recording
 * Uses OpenAI Whisper for transcription, then GPT for event extraction
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio') as File;

    if (!audio) {
      return NextResponse.json(
        { error: 'Please provide an audio recording to analyze' },
        { status: 400 }
      );
    }

    // Step 1: Transcribe audio using Whisper
    const whisperFormData = new FormData();
    whisperFormData.append('file', audio);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'en');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      console.error('[Voice Extract] Whisper API error:', await whisperResponse.text());
      return NextResponse.json(
        { error: 'Failed to transcribe audio' },
        { status: 500 }
      );
    }

    const whisperData = await whisperResponse.json();
    const transcribedText = whisperData.text;

    console.log('[Voice Extract] Transcribed text:', transcribedText);

    if (!transcribedText || transcribedText.trim().length === 0) {
      return NextResponse.json({
        success: true,
        hasEvents: false,
        events: [],
        explanation: 'No speech detected in the recording',
      });
    }

    // Step 2: Extract event information from transcribed text using the same prompt as SMS
    const systemPrompt = `You are an AI assistant that extracts event information from spoken descriptions.

Analyze the following transcribed speech and extract ALL event details you can find. If multiple events are mentioned, extract each one separately.

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

If the speech doesn't contain event information, set hasEvents to false and return an empty events array.
IMPORTANT: If multiple events are mentioned (e.g., "Soccer on Monday and dance class on Wednesday"), create separate event objects for each one.

IMPORTANT CONTEXT - Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Current date: ${new Date().toISOString().split('T')[0]}
Current day of week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}

When parsing dates:
- "tomorrow" = add 1 day to current date
- "next week" = add 7 days
- "this [day of week]" = the NEXT occurrence of that day in the current week (if it hasn't passed) OR next week (if it has passed)
- "next [day of week]" = the occurrence of that day in the following week (7+ days away)
- Day names alone (Monday, Tuesday, etc) = find the next occurrence from today
- Month/day with no year = use current year if in future, otherwise next year

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

IMPORTANT - Extract Names:
- If the speech mentions a specific child's name (e.g., "Emma's soccer practice" or "dance class for Sarah"), extract that name in the childName field
- Look for possessive forms ("Emma's", "Sarah's") or "for [name]" patterns
- If multiple children are mentioned for the same event, separate names with ", " (e.g., "Emma, Sarah")

Examples:
- "Soccer practice Saturday at 9am at City Park" → title="Soccer Practice", category="Soccer"
- "Emma has piano lesson Monday at 4pm" → title="Piano Lesson", childName="Emma", category="Music Lessons"
- "Basketball practice for Jake and Emma Wednesday at 6" → childName="Jake, Emma", category="Basketball"
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
            content: `Extract event information from this transcribed speech:

${transcribedText}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('[Voice Extract] OpenAI API error:', await openaiResponse.text());
      return NextResponse.json(
        { error: 'Failed to analyze transcribed speech' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const result = JSON.parse(openaiData.choices[0].message.content);

    console.log('[Voice Extract] Result:', result);

    return NextResponse.json({
      success: true,
      transcription: transcribedText,
      ...result,
    });
  } catch (error: any) {
    console.error('[Voice Extract] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract event information from voice recording', details: error.message },
      { status: 500 }
      );
  }
}

/**
 * GET endpoint for status check
 */
export async function GET() {
  return NextResponse.json({
    message: 'Voice event extraction endpoint',
    status: 'operational',
    instructions: 'POST with FormData containing "audio" file (webm, mp3, mp4, etc.)',
  });
}
