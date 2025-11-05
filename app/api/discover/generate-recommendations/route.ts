import { NextRequest, NextResponse } from "next/server";

/**
 * Generates personalized activity recommendations for a family
 * Takes scraped events and matches them with family profile
 */
export async function POST(request: NextRequest) {
  try {
    const { familyId, events, familyMembers, userLocation } = await request.json();

    if (!familyId || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "Missing required fields: familyId, events" },
        { status: 400 }
      );
    }

    // Build family context for AI
    const familyContext = familyMembers?.map((member: any) => {
      const age = member.birthdate ? calculateAge(member.birthdate) : null;
      return {
        name: member.name,
        age,
        interests: member.interests || [],
        relationship: member.relationship,
      };
    }) || [];

    const familySummary = familyContext.length > 0
      ? familyContext.map((m: any) =>
          `${m.name} (${m.age ? `age ${m.age}` : m.relationship}${m.interests.length > 0 ? `, interested in: ${m.interests.join(", ")}` : ""})`
        ).join("; ")
      : "No family member details provided";

    const recommendations: any[] = [];

    // Process events in batches to avoid token limits
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      const systemPrompt = `You are a family activity recommendation expert. You analyze local events and determine which ones are good matches for specific families.

Family Profile:
${familySummary}

${userLocation ? `Location: ${userLocation}` : ""}

For each event provided, determine:
1. Is this event appropriate and interesting for this family?
2. Which family member(s) would benefit most?
3. Why is this a good match?

Return a JSON object with this structure:
{
  "recommendations": [
    {
      "eventIndex": 0,
      "recommended": true/false,
      "matchScore": 0-100,
      "targetMembers": ["member name", ...],
      "reasoning": "Brief explanation of why this is a good/bad match",
      "category": "sports/arts/education/etc",
      "aiSummary": "Personalized 1-2 sentence pitch for the family"
    }
  ]
}

Only recommend events with matchScore > 60. Be selective - not every event is right for every family.`;

      const eventsText = batch.map((event, idx) => `
Event ${idx}:
Title: ${event.title}
Description: ${event.description || "No description"}
Category: ${event.category}
Date: ${event.date || "Not specified"}
Time: ${event.time || "Not specified"}
Location: ${event.location || "Not specified"}
Age Range: ${event.ageRange || "Not specified"}
Price: ${event.priceRange || "Not specified"}
${event.recurring ? "Recurring: Yes" : ""}
      `).join("\n---\n");

      try {
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Analyze these events:\n\n${eventsText}` },
            ],
            response_format: { type: "json_object" },
            temperature: 0.5,
          }),
        });

        if (!openaiResponse.ok) {
          console.error(`OpenAI API error in batch ${i / batchSize}`);
          continue;
        }

        const openaiData = await openaiResponse.json();
        const aiResponse = JSON.parse(openaiData.choices[0].message.content);

        // Merge AI recommendations with original event data
        if (aiResponse.recommendations && Array.isArray(aiResponse.recommendations)) {
          for (const rec of aiResponse.recommendations) {
            if (rec.recommended && rec.matchScore > 60) {
              const originalEvent = batch[rec.eventIndex];
              recommendations.push({
                ...originalEvent,
                matchScore: rec.matchScore,
                targetMembers: rec.targetMembers,
                reasoning: rec.reasoning,
                aiSummary: rec.aiSummary,
                recommendedForFamily: familyId,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize}:`, error);
        continue;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Sort by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      success: true,
      recommendationsCount: recommendations.length,
      recommendations,
      familyProfile: familySummary,
    });
  } catch (error: any) {
    console.error("Recommendation generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations", details: error.message },
      { status: 500 }
    );
  }
}

function calculateAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
