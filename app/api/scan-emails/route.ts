import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";

function getConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
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
    ? `You are extracting event information from emails for a family calendar. Today's date is ${currentDate}. IMPORTANT: Only extract events that are clearly related to one or more of these specific family members: ${familyMemberList}.

STRICT RULES:
1. The email MUST mention at least one of the tracked family members by name (including their nicknames)
2. The event MUST be relevant to that family member (their activity, appointment, event they're attending, etc.)
3. Do NOT extract general promotional emails, newsletters, or events that don't involve the tracked family members
4. Do NOT extract events just because they're family-friendly - they must be FOR one of the tracked members
5. IMPORTANT: If the email contains MULTIPLE events (e.g., a schedule of games, multiple practice sessions, recurring appointments), extract ALL of them as separate events

Extract ALL relevant details from the email. Return JSON with this structure:
{
  "events": [
    {
      "title": "Event name (REQUIRED)",
      "date": "YYYY-MM-DD (REQUIRED)",
      "time": "HH:MM in 24-hour format (optional)",
      "endTime": "HH:MM in 24-hour format (optional)",
      "location": "Full address or venue name (optional)",
      "description": "Important details (optional)",
      "familyMemberName": "EXACTLY one of these names: ${familyMemberList.split(';').map(m => m.split('(')[0].trim()).join(', ')} (REQUIRED)",
      "category": "sports/lessons/school/appointment/party/etc (optional)",
      "requiresRSVP": true/false (optional),
      "rsvpDeadline": "YYYY-MM-DD (optional)",
      "confidence": 0.0-1.0 (0.8+ for clear events, 0.5-0.7 for ambiguous)
    }
  ]
}

Date parsing rules:
  * "October 14" or "Oct 14" with no year mentioned -> ${currentYear}-10-14
  * "Friday at 3pm" -> find the NEXT Friday's date after ${currentDate} in YYYY-MM-DD format
  * "tomorrow" -> calculate from today (${currentDate})
  * "next Monday" -> calculate next Monday from today
  * If a year is mentioned (e.g., "October 14, 2025"), use that year
  * Relative dates like "this Friday" should use the NEXT occurrence from today

Time parsing rules:
  * "3pm" or "3:00pm" -> "15:00"
  * "9am" or "9:00am" -> "09:00"
  * "3:30 PM" -> "15:30"
  * "noon" or "12pm" -> "12:00"
  * If no time is mentioned, leave empty (don't guess)

If the email doesn't mention any tracked family members or isn't a relevant event for them, return {"events": []}.`
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
      "description": "Important details (optional)",
      "familyMemberName": "Name of family member if mentioned (optional)",
      "category": "sports/lessons/school/appointment/party/etc (optional)",
      "requiresRSVP": true/false (optional),
      "rsvpDeadline": "YYYY-MM-DD (optional)",
      "confidence": 0.0-1.0 (0.8+ for clear, 0.5-0.7 for ambiguous)
    }
  ]
}

Date parsing: "October 14" with no year -> ${currentYear}-10-14, "Friday at 3pm" -> find NEXT Friday after ${currentDate}, "tomorrow" -> calculate from ${currentDate}
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

      // If family members are tracked, require familyMemberName to be present
      if (familyMembers.length > 0 && !event.familyMemberName) {
        console.log("Skipping event - no tracked family member mentioned:", event.title);
        continue;
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
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    }

    // Create fresh Convex client for this request
    const convex = getConvexClient();

    // Get Gmail account from Convex
    const account = await convex.query(api.gmailAccounts.getGmailAccountById, { accountId });

    if (!account) {
      return NextResponse.json({ error: "Gmail account not found" }, { status: 404 });
    }

    // Get tracked family members for this family
    const familyMembers = await convex.query(api.familyMembers.getFamilyMembers, {
      familyId: account.familyId,
    });

    console.log(`Found ${familyMembers.length} tracked family members for filtering`);

    // Refresh access token
    const accessToken = await refreshAccessToken(account.refreshToken);

    // Initialize Gmail API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Get recent emails (last 30 days) with broad keyword filtering
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const query = `after:${thirtyDaysAgo} (class OR practice OR game OR tournament OR recital OR performance OR meeting OR conference OR party OR birthday OR celebration OR dinner OR lunch OR appointment OR reservation OR event OR activity OR lesson OR session OR camp OR trip OR visit OR playdate OR gathering OR invitation OR invite OR rsvp OR reminder OR schedule OR calendar)`;

    const messagesResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 25, // Reduced to 25 to prevent rate limiting during scans
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
    console.error("Email scanning error:", error);
    return NextResponse.json(
      { error: "Failed to scan emails", details: error.message },
      { status: 500 }
    );
  }
}
