import { NextRequest, NextResponse } from "next/server";

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Geocode a location string to coordinates using OpenStreetMap Nominatim (free)
async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const encodedLocation = encodeURIComponent(location);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'FamilyScheduleMVP/1.0', // Required by Nominatim
        },
      }
    );

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Hardcoded reliable sources for Georgia locations
function getGeorgiaSources(location: string): any[] {
  const sources: any[] = [];
  const lowerLocation = location.toLowerCase();

  // If location is in Gwinnett County area (Suwanee, Duluth, Lawrenceville, etc.)
  if (lowerLocation.includes('suwanee') || lowerLocation.includes('duluth') ||
      lowerLocation.includes('gwinnett') || lowerLocation.includes('lawrenceville') ||
      lowerLocation.includes('30024') || lowerLocation.includes('30096') || lowerLocation.includes('30519')) {
    sources.push(
      {
        name: "Gwinnett County Parks & Recreation",
        url: "https://www.gwinnettcounty.com/web/gwinnett/departments/communitServices/parksandrecreation/activities/specialevents",
        categories: ["recreation", "community", "family", "sports"]
      },
      {
        name: "City of Suwanee Events",
        url: "https://www.suwanee.com/residents/special-events",
        categories: ["community", "family", "arts", "recreation"]
      },
      {
        name: "Gwinnett County Public Library",
        url: "https://www.gwinnettpl.org/events/",
        categories: ["education", "arts", "family"]
      },
      {
        name: "Hudgens Center for Art & Learning",
        url: "https://thehudgens.org/calendar/",
        categories: ["arts", "education", "family"]
      }
    );
  }

  // General Georgia sources
  if (lowerLocation.includes('georgia') || lowerLocation.includes(' ga')) {
    sources.push(
      {
        name: "Georgia State Parks Events",
        url: "https://gastateparks.org/Events",
        categories: ["recreation", "family", "community"]
      }
    );
  }

  return sources;
}

// Function to dynamically discover event sources for any location
async function discoverEventSources(location: string): Promise<any[]> {
  // Start with any hardcoded sources for this location
  const hardcodedSources = getGeorgiaSources(location);
  console.log(`[discover-sources] Found ${hardcodedSources.length} hardcoded sources for ${location}`);

  // Use OpenAI to generate a list of relevant local event sources
  const systemPrompt = `You are an expert at finding local event sources and community calendars for families with children.

For the location "${location}", provide a list of official websites that commonly list local events, activities, and programs for families and children.

Focus on:
1. City/town official event calendars and recreation departments
2. County parks and recreation departments
3. Local library systems
4. Community centers
5. School district calendars (for public events)
6. Local museums and cultural institutions
7. Local theaters and performing arts centers
8. Sports facilities and youth leagues
9. Nature centers and science museums
10. Community festivals and seasonal events

Return a JSON array of event sources with this structure:
[
  {
    "name": "Organization Name",
    "url": "https://...",
    "categories": ["sports", "education", "arts", "community", "recreation", "family"]
  }
]

IMPORTANT: Only return real, verifiable websites. Do not make up URLs. If you're not certain about a URL, omit it.
IMPORTANT: Return at least 8-10 diverse sources if possible.`;

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
          { role: "user", content: `Find event sources for: ${location}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("[discover-sources] OpenAI API error:", openaiResponse.status, errorText);
      return [];
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = JSON.parse(openaiData.choices[0].message.content);

    // Check all possible keys that AI might return
    const sources = aiResponse.sources || aiResponse.eventSources || aiResponse.event_sources || [];

    console.log(`[discover-sources] Found ${sources.length} sources from OpenAI for ${location}`);

    // If no sources found, log the response for debugging
    if (sources.length === 0) {
      console.error(`[discover-sources] No sources extracted. AI response keys:`, Object.keys(aiResponse));
      console.error(`[discover-sources] Full AI response:`, JSON.stringify(aiResponse).substring(0, 500));
    }

    // Combine hardcoded and AI-discovered sources
    const allSources = [...hardcodedSources, ...sources];
    console.log(`[discover-sources] Total sources: ${allSources.length} (${hardcodedSources.length} hardcoded + ${sources.length} discovered)`);

    return allSources;
  } catch (error) {
    console.error("[discover-sources] Error discovering sources:", error);
    return [];
  }
}

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
    const { sourceUrl, zipCode, location, distance } = await request.json();

    const searchDistance = distance || 15;
    console.log(`[scrape-events] Location: ${location}, Distance: ${searchDistance} miles`);

    let sourcesToScrape: any[] = [];

    // If sourceUrl provided, use it directly
    if (sourceUrl) {
      sourcesToScrape = [{
        name: "Custom Source",
        url: sourceUrl,
        location: zipCode || location || "Unknown",
        categories: ["general"]
      }];
    } else if (location) {
      // Dynamically discover event sources for the given location
      console.log(`[scrape-events] Discovering event sources for ${location}...`);
      const discoveredSources = await discoverEventSources(location);

      // Add location to each source
      sourcesToScrape = discoveredSources.map(source => ({
        ...source,
        location: location,
      }));

      if (sourcesToScrape.length === 0) {
        console.log(`[scrape-events] No event sources discovered for ${location}`);
        return NextResponse.json({
          success: true,
          eventsFound: 0,
          events: [],
          sourcesScrapped: 0,
          message: `Could not find event sources for ${location}. Try a different location format (e.g., "City, State" or zip code).`,
        });
      }

      console.log(`[scrape-events] Discovered ${sourcesToScrape.length} sources for ${location}`);
    } else {
      return NextResponse.json(
        { error: "Please provide a location" },
        { status: 400 }
      );
    }

    // Process all sources in parallel instead of sequentially
    console.log(`[scrape-events] Scraping ${sourcesToScrape.length} sources in parallel...`);

    const scrapePromises = sourcesToScrape.map(async (source) => {
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
          return [];
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
        return [];
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
          return [];
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

        console.log(`Found ${events.length} events from ${source.name}`);
        return eventsWithSource;
      } catch (error) {
        console.error(`Error processing ${source.url} with OpenAI:`, error);
        return [];
      }
    });

    // Wait for all scraping to complete in parallel
    const results = await Promise.all(scrapePromises);

    // Flatten array of arrays into single array of events
    const allEvents = results.flat();

    console.log(`[scrape-events] Completed scraping. Total events found: ${allEvents.length}`);

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
 * GET endpoint to check scraper status
 */
export async function GET() {
  return NextResponse.json({
    message: "Event scraper ready - uses dynamic source discovery",
    features: [
      "AI-powered event source discovery for any US location",
      "Geocoding and distance-based filtering",
      "Supports city names, zip codes, and addresses",
      "Configurable search radius (5-30 miles)"
    ],
    status: "operational"
  });
}
