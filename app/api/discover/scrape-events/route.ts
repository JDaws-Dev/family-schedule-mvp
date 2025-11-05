import { NextRequest, NextResponse } from "next/server";

// List of local event sources to scrape (easily expandable)
const EVENT_SOURCES = [
  {
    name: "Suwanee Events Calendar",
    url: "https://www.suwanee.com/events",
    location: "Suwanee, GA",
    zipCodes: ["30024", "30519"], // Suwanee zip codes
    categories: ["community", "entertainment", "family"],
  },
  {
    name: "Gwinnett County Parks & Rec",
    url: "https://www.gwinnettcounty.com/web/gwinnett/Departments/CommunityServices/ParksandRecreation",
    location: "Gwinnett County, GA",
    zipCodes: ["30024", "30519", "30043", "30044", "30045", "30046", "30047", "30048", "30049", "30052", "30078", "30083", "30084", "30086", "30087", "30093", "30094", "30095", "30096", "30097", "30098"], // Gwinnett County zip codes
    categories: ["sports", "recreation", "education"],
  },
  {
    name: "Suwanee Library Events",
    url: "https://www.gwinnettpl.org/branches/suwanee",
    location: "Suwanee, GA",
    zipCodes: ["30024", "30519"], // Suwanee zip codes
    categories: ["education", "arts", "family"],
  },
  // Add more sources as needed - museums, community centers, etc.
];

interface ExtractedEvent {
  title: string;
  description?: string;
  category: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  endTime?: string;
  location?: string;
  address?: string;
  website?: string;
  phoneNumber?: string;
  priceRange?: string;
  ageRange?: string;
  recurring?: boolean;
  registrationRequired?: boolean;
  registrationDeadline?: string;
}

/**
 * AI-powered web scraping endpoint
 * Uses Jina Reader (free) to convert HTML to markdown, then OpenAI to extract structured event data
 */
export async function POST(request: NextRequest) {
  try {
    const { sourceUrl, zipCode, location } = await request.json();

    // If no sourceUrl provided, scrape all default sources (filtered by location if provided)
    let sourcesToScrape = sourceUrl
      ? [{ name: "Custom Source", url: sourceUrl, location: zipCode || location || "Unknown", categories: ["general"] }]
      : EVENT_SOURCES;

    // Filter sources by location if provided
    if (location && !sourceUrl) {
      sourcesToScrape = EVENT_SOURCES.filter(source => {
        // Check if location matches city name
        const cityMatch = source.location.toLowerCase().includes(location.toLowerCase()) ||
          location.toLowerCase().includes(source.location.toLowerCase());

        // Check if location matches zip code
        const zipMatch = source.zipCodes && source.zipCodes.includes(location.trim());

        return cityMatch || zipMatch;
      });

      // If no sources match the location, use a fallback message
      if (sourcesToScrape.length === 0) {
        console.log(`No event sources configured for location: ${location}`);
        // For now, we'll return empty results, but in the future we could add dynamic source discovery
      }
    }

    const allEvents: any[] = [];

    for (const source of sourcesToScrape) {
      console.log(`Scraping: ${source.name} (${source.url})`);

      // Step 1: Use Jina Reader to convert webpage to clean markdown
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(source.url)}`;

      let webContent: string;
      try {
        const jinaResponse = await fetch(jinaUrl, {
          headers: {
            'Accept': 'text/plain',
            'X-Timeout': '30',
          },
        });

        if (!jinaResponse.ok) {
          console.error(`Jina Reader failed for ${source.url}: ${jinaResponse.statusText}`);
          continue;
        }

        webContent = await jinaResponse.text();
        console.log(`Fetched ${webContent.length} characters from ${source.name}`);

        // Try to find and extract the events section
        const eventsMarkers = ['Community Events', 'Calendar', 'Upcoming Events', 'Events Calendar'];
        let eventsStartIndex = -1;

        for (const marker of eventsMarkers) {
          const index = webContent.indexOf(marker);
          if (index !== -1 && (eventsStartIndex === -1 || index < eventsStartIndex)) {
            eventsStartIndex = index;
            console.log(`Found marker "${marker}" at index ${index}`);
          }
        }

        // If we found an events section, start from there; otherwise use the full content
        if (eventsStartIndex !== -1 && eventsStartIndex > 1000) {
          // Keep some context before the events section (500 chars)
          const contextStart = Math.max(0, eventsStartIndex - 500);
          webContent = webContent.slice(contextStart, contextStart + 12000);
          console.log(`Using events section from ${contextStart} to ${contextStart + 12000}`);
        } else {
          // No events section found, use first 12000 chars
          webContent = webContent.slice(0, 12000);
          console.log(`No events section found, using first 12000 chars`);
        }
      } catch (error) {
        console.error(`Error fetching ${source.url}:`, error);
        continue;
      }

      // Step 2: Use OpenAI to extract structured event data
      const today = new Date().toISOString().split('T')[0];
      const currentYear = new Date().getFullYear();

      const systemPrompt = `You are an expert at extracting event information from website content. Today's date is ${today}.

Extract ALL upcoming events from this webpage. For each event, provide:

- title (string, REQUIRED): Event name/title
- description (string, optional): Brief description of what the event is about
- category (string, REQUIRED): Choose from: "sports", "arts", "education", "entertainment", "community", "recreation", "family", "other"
- date (YYYY-MM-DD, optional): Event date. Parse carefully:
  * "November 15" with no year -> ${currentYear}-11-15
  * "Nov 15-17" -> separate events for each date
  * "Every Tuesday" -> mark as recurring, provide next occurrence
- time (HH:MM in 24-hour format, optional): Start time
- endTime (HH:MM, optional): End time if mentioned
- location (string, optional): Venue or facility name
- address (string, optional): Full street address if provided
- website (string, optional): Event-specific URL or registration link
- phoneNumber (string, optional): Contact number
- priceRange (string, optional): "Free", "$" (under $25), "$$" ($25-75), "$$$" ($75+)
- ageRange (string, optional): e.g., "5-12 years", "All ages", "Adults only"
- recurring (boolean, optional): Is this a recurring event?
- registrationRequired (boolean, optional): Does it require registration?
- registrationDeadline (YYYY-MM-DD, optional): Deadline to register

Return a JSON array of events. If no events found, return empty array [].

IMPORTANT: Only extract actual events with specific details. Skip general program descriptions unless they have specific dates/times.`;

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
              { role: "user", content: `Extract all events from this webpage content:\n\n${webContent}` },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
          }),
        });

        if (!openaiResponse.ok) {
          console.error(`OpenAI API error for ${source.url}`);
          continue;
        }

        const openaiData = await openaiResponse.json();
        const aiResponse = JSON.parse(openaiData.choices[0].message.content);

        // Handle both {events: [...]} and direct array responses
        const events: ExtractedEvent[] = Array.isArray(aiResponse) ? aiResponse : (aiResponse.events || []);

        // Add source metadata to each event
        const eventsWithSource = events.map((event: ExtractedEvent) => ({
          ...event,
          sourceName: source.name,
          sourceUrl: source.url,
          sourceLocation: source.location,
          sourceCategories: source.categories,
          scrapedAt: new Date().toISOString(),
        }));

        allEvents.push(...eventsWithSource);
        console.log(`Found ${events.length} events from ${source.name}`);
      } catch (error) {
        console.error(`Error processing ${source.url} with OpenAI:`, error);
        continue;
      }

      // Rate limiting - wait 1 second between sources
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({
      success: true,
      eventsFound: allEvents.length,
      events: allEvents,
      sourcesScrapped: sourcesToScrape.length,
    });
  } catch (error: any) {
    console.error("Event scraping error:", error);
    return NextResponse.json(
      { error: "Failed to scrape events", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to manually trigger scraping (for testing)
 */
export async function GET() {
  return NextResponse.json({
    message: "Event scraper ready",
    sources: EVENT_SOURCES.length,
    sourcesConfigured: EVENT_SOURCES.map(s => ({ name: s.name, categories: s.categories })),
  });
}
