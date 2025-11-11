import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";

function getConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

async function refreshAccessToken(refreshToken: string) {
  console.log("[refreshAccessToken] Attempting to refresh Google OAuth token...");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("[refreshAccessToken] Failed to refresh token:", {
      status: response.status,
      statusText: response.statusText,
      error: data.error,
      error_description: data.error_description,
    });
    throw new Error(`Failed to refresh access token: ${data.error_description || data.error || "Unknown error"}`);
  }

  console.log("[refreshAccessToken] Successfully refreshed access token");
  return data.access_token;
}

async function extractEventsFromEmail(message: any, familyMembers: any[]): Promise<any[]> {
  const headers = message.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
  const from = headers.find((h: any) => h.name === "From")?.value || "";

  let body = "";
  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
  } else if (message.payload?.parts) {
    const textPart = message.payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }
  }

  let emailText = `Subject: ${subject}\nFrom: ${from}\n\n${body}`.slice(0, 3000);

  // Extract links from the email body
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const links = body.match(urlRegex) || [];

  // If there are links, try to fetch content from them using Jina Reader
  if (links.length > 0) {
    console.log(`Found ${links.length} links in email: ${subject}`);

    // Limit to first 2 links to avoid excessive processing
    const linksToFetch = links.slice(0, 2);

    for (const link of linksToFetch) {
      try {
        console.log(`Fetching content from link: ${link}`);
        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(link)}`;

        const jinaResponse = await fetch(jinaUrl, {
          headers: {
            'Accept': 'text/plain',
            'X-Timeout': '10',
          },
        });

        if (jinaResponse.ok) {
          const linkContent = await jinaResponse.text();
          // Add the link content to the email text (limit to 2000 chars per link)
          emailText += `\n\n--- Content from link ${link} ---\n${linkContent.slice(0, 2000)}`;
          console.log(`Successfully fetched content from ${link}`);
        } else {
          console.log(`Failed to fetch content from ${link}: ${jinaResponse.statusText}`);
        }
      } catch (error) {
        console.error(`Error fetching link ${link}:`, error);
        // Continue with other links even if one fails
      }
    }

    // Limit the total email text to 5000 chars after adding link content
    emailText = emailText.slice(0, 5000);
  }

  // Build list of family members with their nicknames
  const familyMemberList = familyMembers.map(member => {
    const names = [member.name, ...member.nicknames];
    return `${member.name}${member.nicknames.length > 0 ? ` (also known as: ${member.nicknames.join(", ")})` : ""}`;
  }).join("; ");

  // Get current date for better date parsing context
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toISOString().split('T')[0];

  // Build the system prompt with family member context - NOW SUPPORTS MULTIPLE EVENTS
  const systemPrompt = familyMembers.length > 0
    ? `You are extracting event information from emails for a family calendar. Today's date is ${currentDate}. The family is tracking these members: ${familyMemberList}. Extract events that are relevant to family activities and the tracked members.

EXTRACTION RULES:
1. PREFERRED: Extract events that explicitly mention one of the tracked family members by name (including nicknames) - assign high confidence (0.8+)
2. ALSO EXTRACT: Events likely relevant based on context even if no name mentioned:
   - Emails from schools, coaches, teachers, or activity coordinators
   - Practice/game schedules, class schedules, lesson schedules
   - School events, recitals, performances, field trips
   - Birthday party invitations, playdate invitations
   - Doctor/dentist appointments or other family appointments
   - Assign medium confidence (0.6-0.7) when contextually relevant but no explicit name
3. DO NOT extract:
   - Generic promotional emails or advertisements
   - Adult-only work events (unless clearly family-related)
   - Receipts or order confirmations (unless for event tickets)
4. IMPORTANT: If the email contains MULTIPLE events (e.g., a schedule of games, multiple practice sessions, recurring appointments), extract ALL of them as separate events

Extract ALL relevant details from the email. Return JSON with this structure:
{
  "events": [
    {
      "title": "Event name (REQUIRED)",
      "date": "YYYY-MM-DD (REQUIRED)",
      "time": "HH:MM in 24-hour format (optional)",
      "endTime": "HH:MM in 24-hour format (optional)",
      "location": "Full address or venue name (optional)",
      "description": "Write a friendly, helpful 1-2 sentence summary that provides context and important details. Make it warm and conversational, not just copied text. Include what to bring, dress code, or other useful info if mentioned. (optional)",
      "familyMemberName": "EXACTLY one of these names: ${familyMemberList.split(';').map(m => m.split('(')[0].trim()).join(', ')} (OPTIONAL - include only if explicitly mentioned or strongly implied)",
      "category": "sports/lessons/school/appointment/party/etc (optional)",
      "requiresRSVP": true/false (optional),
      "rsvpDeadline": "YYYY-MM-DD (optional)",
      "confidence": 0.0-1.0 (0.8+ for events with explicit names, 0.6-0.7 for contextually relevant, 0.5 for uncertain)
    }
  ]
}

Date parsing rules (CRITICAL - today is ${currentDate}, current year is ${currentYear}):
  * NEVER EVER use dates in the past - ALL events must be in the future (>= ${currentDate})
  * If a specific month and day is mentioned without a year (e.g., "October 14", "Nov 8", "December 25"):
    - Use ${currentYear} if that date hasn't passed yet this year
    - Use ${currentYear + 1} if that date already passed this year
    - Example: "November 8" today (${currentDate}) -> use ${currentYear}-11-08 if >= ${currentDate}, otherwise ${currentYear + 1}-11-08
  * IGNORE day-of-week names if they conflict with the month/day:
    - If email says "Wednesday, November 8" but Nov 8 ${currentYear} is NOT a Wednesday, still use ${currentYear}-11-08 (the sender probably made a mistake)
    - Day names are less reliable than specific dates
  * Days of the week WITHOUT specific dates:
    - "Friday at 3pm" or "Friday night" -> find the NEXT Friday after ${currentDate}
    - "this Friday" -> NEXT Friday after ${currentDate}
    - "next Monday" -> the Monday in the following week (8+ days from ${currentDate})
  * CRITICAL: When parsing day names alone, always find the NEXT occurrence AFTER ${currentDate}
  * "tomorrow" -> calculate from ${currentDate}
  * If a date with year is explicitly mentioned (e.g., "October 14, 2025"), use exactly that date
  * ABSOLUTE RULE: No date should ever be before ${currentDate} unless the email explicitly says "last week" or "already happened"

Time parsing rules:
  * "3pm" or "3:00pm" -> "15:00"
  * "9am" or "9:00am" -> "09:00"
  * "3:30 PM" -> "15:30"
  * "noon" or "12pm" -> "12:00"
  * If no time is mentioned, leave empty (don't guess)

If the email is clearly not a relevant family/children's event (just promotions, receipts, newsletters), return {"events": []}.`
    : `Extract event information from emails about family activities and events. Today's date is ${currentDate}. This includes: children's activities (sports, lessons, school events), family gatherings (parties, birthdays, celebrations), appointments (doctor, dentist, meetings), social events (dinners, playdates, get-togethers), trips and outings.

IMPORTANT: If the email contains MULTIPLE events, extract ALL of them as separate events.

Return JSON with this structure:
{
  "events": [
    {
      "title": "Event name (REQUIRED)",
      "date": "YYYY-MM-DD (REQUIRED)",
      "time": "HH:MM in 24-hour format (optional)",
      "endTime": "HH:MM in 24-hour format (optional)",
      "location": "Full address or venue name (optional)",
      "description": "Write a friendly, helpful 1-2 sentence summary that provides context and important details. Make it warm and conversational, not just copied text. Include what to bring, dress code, or other useful info if mentioned. (optional)",
      "familyMemberName": "Name of family member if mentioned (optional)",
      "category": "sports/lessons/school/appointment/party/etc (optional)",
      "requiresRSVP": true/false (optional),
      "rsvpDeadline": "YYYY-MM-DD (optional)",
      "confidence": 0.0-1.0 (0.8+ for clear, 0.5-0.7 for ambiguous)
    }
  ]
}

Date parsing (CRITICAL - today is ${currentDate}, current year is ${currentYear}):
  * NEVER use dates in the past - ALL events must be >= ${currentDate}
  * "October 14" with no year -> ${currentYear}-10-14 if >= ${currentDate}, otherwise ${currentYear + 1}-10-14
  * IGNORE day-of-week if it conflicts with specific month/day (day names are unreliable)
  * "Friday at 3pm" -> find NEXT Friday after ${currentDate}
  * "tomorrow" -> calculate from ${currentDate}

Time parsing: "3pm" -> "15:00", "9am" -> "09:00", "3:30 PM" -> "15:30"

If no clear events with dates, return {"events": []}.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: emailText },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    const result = await response.json();

    // Check if OpenAI returned an error
    if (!response.ok || !result.choices || result.choices.length === 0) {
      console.error("OpenAI API error:", result);
      return [];
    }

    const parsed = JSON.parse(result.choices[0].message.content);

    // Log what we got back from OpenAI
    console.log("OpenAI response for email:", {
      subject,
      eventsFound: parsed?.events?.length || 0,
    });

    if (!parsed || !parsed.events || !Array.isArray(parsed.events) || parsed.events.length === 0) {
      console.log("Skipping email - no valid events found:", subject);
      return [];
    }

    // Process each event and filter out invalid ones
    const extractedEvents: any[] = [];
    for (const event of parsed.events) {
      if (!event.title || !event.date) {
        console.log("Skipping invalid event - missing title or date:", event);
        continue;
      }

      // If family members are tracked, prefer familyMemberName but allow events without it if confidence is reasonable
      if (familyMembers.length > 0 && !event.familyMemberName) {
        // Allow events without explicit family member if confidence is >= 0.6 (contextually relevant)
        if (!event.confidence || event.confidence < 0.6) {
          console.log("Skipping event - no tracked family member mentioned and low confidence:", event.title, "confidence:", event.confidence);
          continue;
        }
        console.log("Accepting event without explicit family member (confidence:", event.confidence, "):", event.title);
      }

      extractedEvents.push({
        title: event.title,
        eventDate: event.date,
        eventTime: event.time || undefined,
        endTime: event.endTime || undefined,
        location: event.location || undefined,
        description: event.description || undefined,
        category: event.category || undefined,
        childName: event.familyMemberName || undefined, // Map to childName for backward compatibility with schema
        requiresAction: event.requiresRSVP || undefined,
        actionDeadline: event.rsvpDeadline || undefined,
        confidence: event.confidence || 0.7,
        sourceEmailSubject: subject,
      });
    }

    console.log(`Extracted ${extractedEvents.length} valid events from email: ${subject}`);
    return extractedEvents;
  } catch (error) {
    console.error("Error extracting events:", error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[scan-emails] Starting email scan...");
    const { accountId } = await request.json();

    if (!accountId) {
      console.error("[scan-emails] Missing accountId");
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    }

    console.log("[scan-emails] Creating Convex client...");
    // Create fresh Convex client for this request
    const convex = getConvexClient();

    console.log("[scan-emails] Fetching Gmail account from Convex...");
    // Get Gmail account from Convex
    const account = await convex.query(api.gmailAccounts.getGmailAccountById, { accountId });

    if (!account) {
      console.error("[scan-emails] Gmail account not found:", accountId);
      return NextResponse.json({ error: "Gmail account not found" }, { status: 404 });
    }

    console.log("[scan-emails] Fetching family members...");
    // Get tracked family members for this family
    const familyMembers = await convex.query(api.familyMembers.getFamilyMembers, {
      familyId: account.familyId,
    });

    console.log(`[scan-emails] Found ${familyMembers.length} tracked family members for filtering`);

    console.log("[scan-emails] Refreshing access token...");
    // Refresh access token
    const accessToken = await refreshAccessToken(account.refreshToken);

    // Initialize Gmail API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // DEBUG: First check if we can get ANY emails at all
    console.log("[scan-emails] Testing Gmail API with simple query...");
    const testResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 5,
    });
    console.log("[scan-emails] Simple query returned:", testResponse.data.messages?.length || 0, "messages");

    // Get recent emails (last 30 days) with broad keyword filtering
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const query = `after:${thirtyDaysAgo} (class OR practice OR game OR tournament OR recital OR performance OR meeting OR conference OR party OR birthday OR celebration OR dinner OR lunch OR appointment OR reservation OR event OR activity OR lesson OR session OR camp OR trip OR visit OR playdate OR gathering OR invitation OR invite OR rsvp OR reminder OR schedule OR calendar OR wedding OR rehearsal OR ceremony OR reception OR concert OR show OR festival OR fair OR banquet OR potluck OR barbecue OR picnic OR sleepover OR field trip)`;

    console.log("[scan-emails] Gmail query:", query);

    const messagesResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50, // Scan up to 50 recent emails for events
    });

    console.log("[scan-emails] Gmail API response:", {
      resultSizeEstimate: messagesResponse.data.resultSizeEstimate,
      messagesCount: messagesResponse.data.messages?.length || 0,
    });

    const messages = messagesResponse.data.messages || [];
    const extractedEvents: any[] = [];

    console.log(`Processing ${messages.length} messages...`);

    for (const message of messages) {
      // Check if already processed
      const alreadyProcessed = await convex.query(api.emailProcessing.isEmailProcessed, {
        gmailAccountId: accountId,
        gmailMessageId: message.id!,
      });

      if (alreadyProcessed) {
        console.log(`Skipping already processed message: ${message.id}`);
        continue;
      }

      // Get full message
      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      });

      // Extract events using OpenAI with family member filtering (can return multiple events per email)
      const events = await extractEventsFromEmail(fullMessage.data, familyMembers);

      // Rate limiting: Wait 500ms between requests to avoid hitting OpenAI rate limits
      // Conservative delay to prevent rate limit errors during production use
      await new Promise(resolve => setTimeout(resolve, 500));

      // Process each extracted event
      for (const event of events) {
        extractedEvents.push({
          ...event,
          sourceEmailId: message.id,
        });

        // Create unconfirmed event in Convex (exclude confidence field)
        const { confidence, ...eventData } = event;
        await convex.mutation(api.events.createUnconfirmedEvent, {
          familyId: account.familyId,
          createdByUserId: account.connectedByUserId,
          sourceGmailAccountId: accountId,
          ...eventData,
          sourceEmailId: message.id,
        });
      }

      // Log processing
      await convex.mutation(api.emailProcessing.logEmailProcessing, {
        gmailAccountId: accountId,
        gmailMessageId: message.id!,
        subject: fullMessage.data.payload?.headers?.find((h: any) => h.name === "Subject")?.value,
        fromEmail: fullMessage.data.payload?.headers?.find((h: any) => h.name === "From")?.value,
        eventsExtracted: events.length,
        processingStatus: "processed",
      });
    }

    // Update last sync time
    await convex.mutation(api.gmailAccounts.updateLastSync, { accountId });

    return NextResponse.json({
      success: true,
      messagesScanned: messages.length,
      eventsFound: extractedEvents.length,
      events: extractedEvents,
    });
  } catch (error: any) {
    console.error("[scan-emails] Email scanning error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        error: "Failed to scan emails",
        details: error.message,
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}
