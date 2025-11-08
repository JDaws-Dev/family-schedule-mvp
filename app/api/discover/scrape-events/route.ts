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

// Function to dynamically discover event sources for any location
async function discoverEventSources(location: string): Promise<any[]> {
  // Use OpenAI to generate a list of relevant local event sources
  const systemPrompt = `You are an expert at finding local event sources, activity calendars, and family-friendly places for families with children.

For the location "${location}", provide a list of official websites that list:
A) SCHEDULED EVENTS (specific dates/times)
B) ONGOING PLACES TO VISIT (museums, parks, entertainment venues with regular hours)

Focus on:
**Scheduled Events:**
1. City/town official event calendars and recreation departments
2. County parks and recreation departments
3. Local library systems and their event calendars
4. Community centers
5. School district calendars (for public events)
6. Community festivals and seasonal events
7. Sports facilities and youth leagues (seasonal programs)

**Ongoing Places:**
8. Local museums, children's museums, science centers
9. Zoos and aquariums
10. Libraries (story times, maker spaces)
11. Public parks, nature centers, botanical gardens
12. Recreation centers with open swim/gym times
13. Family entertainment venues (trampoline parks, bowling, mini golf)
14. Art studios and theaters offering drop-in or ongoing programs
15. Indoor playgrounds and play cafes

Return a JSON array with this structure:
[
  {
    "name": "Organization Name",
    "url": "https://...",
    "categories": ["sports", "education", "arts", "community", "recreation", "family", "entertainment"],
    "type": "events" or "places" or "both"
  }
]

IMPORTANT: Only return real, verifiable websites. Do not make up URLs. If you're not certain about a URL, omit it.
IMPORTANT: Return at least 10-15 diverse sources if possible, mixing both event sources and ongoing places.`;

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

    return sources;
  } catch (error) {
    console.error("[discover-sources] Error discovering sources:", error);
    return [];
  }
}

interface ExtractedEvent {
  title: string;
  description?: string;
  category: string;
  type?: 'event' | 'place'; // NEW: distinguish events from ongoing places
  // For EVENTS (specific dates/times):
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  endTime?: string;
  recurring?: boolean;
  registrationRequired?: boolean;
  registrationDeadline?: string;
  // For PLACES (ongoing venues with hours):
  hoursOfOperation?: string; // e.g., "Mon-Fri 9am-5pm, Sat-Sun 10am-6pm"
  admission?: string; // e.g., "Free", "$15 adults, $10 children", etc.
  amenities?: string[]; // e.g., ["playground", "splash pad", "picnic area"]
  // Common to both:
  location?: string;
  address?: string;
  website?: string;
  phoneNumber?: string;
  priceRange?: string;
  ageRange?: string;
}

/**
 * AI-powered web scraping endpoint
 * Uses Jina Reader (free) to convert HTML to markdown, then OpenAI to extract structured event data
 */
export async function POST(request: NextRequest) {
  try {
    const { sourceUrl, zipCode, location, distance, startDate, endDate } = await request.json();

    const searchDistance = distance || 15;

    // Set default date range if not provided (today to 30 days from now)
    const today = new Date().toISOString().split('T')[0];
    const defaultEndDate = (() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      return futureDate.toISOString().split('T')[0];
    })();

    const dateRangeStart = startDate || today;
    const dateRangeEnd = endDate || defaultEndDate;

    console.log(`[scrape-events] Location: ${location}, Distance: ${searchDistance} miles, Date Range: ${dateRangeStart} to ${dateRangeEnd}`);

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
      const currentYear = new Date().getFullYear();

      const systemPrompt = `You are an expert at extracting both SCHEDULED EVENTS and ONGOING PLACES from website content. Today's date is ${dateRangeStart}.

Extract TWO TYPES of family-friendly activities:

**TYPE A - SCHEDULED EVENTS** (specific dates/times between ${dateRangeStart} and ${dateRangeEnd}):
Examples: concerts, festivals, workshops, classes with registration, sports games, story times

**TYPE B - ONGOING PLACES** (venues/facilities with regular hours that families can visit anytime):
Examples: museums, parks, libraries, playgrounds, zoos, recreation centers, entertainment venues

For each item, provide:

**REQUIRED FOR ALL:**
- title (string, REQUIRED): Name of the event or place
- type (string, REQUIRED): "event" or "place"
- description (string, optional): Brief description
- category (string, REQUIRED): "sports", "arts", "education", "entertainment", "community", "recreation", "family", "movie night", "other"
- location (string, optional): Venue or facility name
- address (string, optional): Full street address if provided
- website (string, IMPORTANT): Direct URL to details page
- phoneNumber (string, optional): Contact number
- priceRange (string, optional): "Free", "$" (under $25), "$$" ($25-75), "$$$" ($75+)
- ageRange (string, optional): e.g., "5-12 years", "All ages", "Toddlers"

**FOR EVENTS ONLY (type="event"):**
- date (YYYY-MM-DD, required for events): Parse carefully:
  * "November 15" with no year -> ${currentYear}-11-15
  * "Nov 15-17" -> create separate events for each date
  * "Every Tuesday" -> mark as recurring, provide next occurrence
- time (HH:MM in 24-hour format, optional): Start time
- endTime (HH:MM, optional): End time
- recurring (boolean, optional): Is this a recurring event?
- registrationRequired (boolean, optional): Requires registration?
- registrationDeadline (YYYY-MM-DD, optional): Deadline to register

**FOR PLACES ONLY (type="place"):**
- hoursOfOperation (string, optional): e.g., "Mon-Fri 9am-5pm, Sat-Sun 10am-6pm" or "Open daily 9am-9pm"
- admission (string, optional): Admission cost details, e.g., "Free", "$15 adults, $10 children under 12", "Suggested donation $5"
- amenities (array of strings, optional): What's available, e.g., ["playground", "splash pad", "picnic tables", "restrooms", "cafe", "gift shop", "parking"]

Return a JSON array mixing both events and places. If nothing found, return empty array [].

IMPORTANT:
- Events MUST have specific dates between ${dateRangeStart} and ${dateRangeEnd}
- Places should be family-friendly venues that can be visited during the date range
- Only extract items with enough detail to be useful to families`;

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
    let allEvents = results.flat();

    // Filter events by date range (some events might not have dates)
    allEvents = allEvents.filter((event: any) => {
      if (!event.date) {
        // Keep events without dates (might be recurring or ongoing)
        return true;
      }

      // Check if event date is within range
      const eventDate = event.date;
      return eventDate >= dateRangeStart && eventDate <= dateRangeEnd;
    });

    console.log(`[scrape-events] Completed scraping. Total events found: ${allEvents.length} (after date filtering)`);

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
