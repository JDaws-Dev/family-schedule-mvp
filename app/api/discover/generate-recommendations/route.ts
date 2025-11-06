import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate personalized activity recommendations using OpenAI
 * Takes scraped events and matches them to family members based on age, interests
 */
export async function POST(request: NextRequest) {
  try {
    const { events, familyMembers, userLocation } = await request.json();

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: 'No events to process',
      });
    }

    // Build family profile for AI
    const familyProfile = familyMembers
      .map((member: any) => {
        const age = member.birthdate
          ? Math.floor(
              (Date.now() - new Date(member.birthdate).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : null;
        return `${member.name} (${age ? age + ' years old' : 'age unknown'}, interests: ${
          member.interests?.join(', ') || 'not specified'
        })`;
      })
      .join('; ');

    // Use OpenAI to match events to family members
    const systemPrompt = `You are a helpful family activity recommendation assistant. You analyze local events and activities to recommend the best matches for specific family members based on their ages and interests.

Family Profile: ${familyProfile}
Location: ${userLocation}

Your task:
1. Review each event
2. Determine which family member(s) would enjoy it based on age appropriateness and interests
3. Assign a match score (0-100) for how well it fits
4. Only recommend events with score >= 60
5. Provide a brief summary explaining why it's a good match

IMPORTANT: For each recommendation, you MUST include:
- title (from original event)
- category (from original event - REQUIRED)
- description (from original event)
- date, time, endTime, location, address, website, phoneNumber (from original event if available)
- matchScore (0-100)
- summary (your explanation of why it's a good match)
- familyMembers (array of names who would enjoy it)

Return a JSON object with a 'recommendations' array where each item preserves ALL fields from the original event.`;

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
            content: `Here are ${events.length} local events to analyze:

${JSON.stringify(events, null, 2)}

For each recommended event, preserve ALL original fields (especially category) and add matchScore, summary, and familyMembers.`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return NextResponse.json(
        { error: 'Failed to generate recommendations' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = JSON.parse(openaiData.choices[0].message.content);

    // Handle both {recommendations: [...]} and direct array responses
    let recommendations = Array.isArray(aiResponse)
      ? aiResponse
      : aiResponse.recommendations || [];

    // Ensure all recommendations have required fields by merging with original events
    recommendations = recommendations.map((rec: any) => {
      // Find the original event by title
      const originalEvent = events.find((e: any) => e.title === rec.title);
      if (originalEvent) {
        // Merge original event fields with AI recommendations
        return {
          ...originalEvent, // Start with all original fields (includes category)
          ...rec,           // Override with AI-added fields (matchScore, summary, familyMembers)
        };
      }
      // If no match found, ensure category exists (fallback to 'other')
      return {
        ...rec,
        category: rec.category || 'other',
      };
    });

    return NextResponse.json({
      success: true,
      recommendations,
      totalEvents: events.length,
      recommendedCount: recommendations.length,
    });
  } catch (error: any) {
    console.error('Recommendation generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations', details: error.message },
      { status: 500 }
    );
  }
}
