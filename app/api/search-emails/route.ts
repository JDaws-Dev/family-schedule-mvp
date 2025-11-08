import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

async function refreshAccessToken(refreshToken: string) {
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
    throw new Error(`Failed to refresh access token: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { query, familyId, timeframeMonths = 3 } = await request.json();

    if (!query || !familyId) {
      return NextResponse.json({ error: "Missing query or familyId" }, { status: 400 });
    }

    console.log(`[search-emails] Searching for: "${query}" (timeframe: ${timeframeMonths} months)`);

    const convex = getConvexClient();

    // Get Gmail accounts for the family
    const gmailAccounts = await convex.query(api.gmailAccounts.getFamilyGmailAccounts, { familyId });

    if (!gmailAccounts || gmailAccounts.length === 0) {
      return NextResponse.json({ error: "No Gmail account connected" }, { status: 404 });
    }

    console.log(`[search-emails] Found ${gmailAccounts.length} Gmail account(s)`);

    const allEvents: any[] = [];

    // Search through all connected Gmail accounts
    for (const account of gmailAccounts) {
      try {
        console.log(`[search-emails] Searching account: ${account.gmailEmail}`);

        // Refresh access token
        const accessToken = await refreshAccessToken(account.refreshToken);

        // Initialize Gmail API
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Search Gmail with the user's query
        // Use Gmail's search syntax to find relevant emails based on timeframe
        const searchDate = new Date(Date.now() - timeframeMonths * 30 * 24 * 60 * 60 * 1000);
        const searchQuery = `${query} after:${searchDate.toISOString().split('T')[0]}`;

        console.log(`[search-emails] Gmail search query: ${searchQuery}`);

        const response = await gmail.users.messages.list({
          userId: "me",
          q: searchQuery,
          maxResults: 20, // Limit to top 20 results
        });

        const messages = response.data.messages || [];
        console.log(`[search-emails] Found ${messages.length} matching emails`);

        // Process each message
        for (const message of messages) {
          try {
            const msgData = await gmail.users.messages.get({
              userId: "me",
              id: message.id!,
              format: "full",
            });

            // Extract email content
            const headers = msgData.data.payload?.headers || [];
            const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "";
            const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "";

            let body = "";

            const getBody = (part: any): string => {
              if (part.body?.data) {
                return Buffer.from(part.body.data, "base64").toString("utf-8");
              }
              if (part.parts) {
                return part.parts.map((p: any) => getBody(p)).join("\n");
              }
              return "";
            };

            body = getBody(msgData.data.payload);

            // Use OpenAI to extract event information
            const currentYear = new Date().getFullYear();
            const currentDate = new Date().toISOString().split('T')[0];

            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You are an expert at extracting event and schedule information from emails. Extract ALL events mentioned in the email, especially schedules, practice times, game times, etc.

Return a JSON object with:
{
  "eventsFound": <number of events found>,
  "events": [
    {
      "title": "Event name",
      "eventDate": "YYYY-MM-DD",
      "eventTime": "HH:MM" (24-hour format, optional),
      "endTime": "HH:MM" (optional),
      "location": "Location name" (optional),
      "description": "Write a friendly, helpful 1-2 sentence summary with context and important details. Make it warm and conversational. (optional)",
      "category": "Sports|School|Medical|Social|Other" (optional),
      "requiresAction": boolean (if RSVP, payment, or response needed),
      "actionDescription": "What action is needed" (optional),
      "actionDeadline": "YYYY-MM-DD" (optional)
    }
  ]
}

DATE PARSING RULES (CRITICAL - today is ${currentDate}, current year is ${currentYear}):
  * NEVER use dates in the past - ALL events must be >= ${currentDate}
  * If month/day without year (e.g., "November 8", "Dec 25"):
    - Use ${currentYear} if that date >= ${currentDate}
    - Use ${currentYear + 1} if that date already passed this year
  * IGNORE day-of-week if it conflicts with specific month/day
    - If email says "Wednesday, November 8" but Nov 8 ${currentYear} is NOT Wednesday, still use ${currentYear}-11-08
    - Day names are unreliable, prioritize the actual date
  * "Friday at 3pm" (no specific date) -> find NEXT Friday after ${currentDate}
  * "tomorrow" -> calculate from ${currentDate}
  * ABSOLUTE RULE: No date before ${currentDate} unless email says "last week" or "already happened"

IMPORTANT: Extract ALL events, schedules, and dates mentioned. If it's a full season schedule, extract every game/practice date.`
                },
                {
                  role: "user",
                  content: `Email Subject: ${subject}\n\nFrom: ${from}\n\nEmail Body:\n${body.substring(0, 10000)}\n\nUser is looking for: ${query}\n\nExtract all relevant events:`
                }
              ],
              response_format: { type: "json_object" },
            });

            const result = JSON.parse(completion.choices[0].message.content || "{}");

            if (result.eventsFound > 0 && result.events) {
              console.log(`[search-emails] Extracted ${result.eventsFound} event(s) from: ${subject}`);

              // Add source information to each event
              result.events.forEach((event: any) => {
                event.sourceEmailSubject = subject;
                event.sourceEmailId = message.id;
                allEvents.push(event);
              });
            }
          } catch (error) {
            console.error(`[search-emails] Error processing message:`, error);
            // Continue with next message
          }
        }
      } catch (error) {
        console.error(`[search-emails] Error searching account ${account.gmailEmail}:`, error);
        // Continue with next account
      }
    }

    console.log(`[search-emails] Total events found: ${allEvents.length}`);

    return NextResponse.json({
      success: true,
      results: allEvents,
      totalFound: allEvents.length,
    });
  } catch (error: any) {
    console.error("[search-emails] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to search emails",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
