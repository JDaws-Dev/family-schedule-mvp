import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { google } from "googleapis";

function getConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&#39;': "'",
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&#x27;': "'",
    '&apos;': "'",
  };
  return text.replace(/&#?\w+;/g, match => entities[match] || match);
}

function normalizeSubject(subject: string): string {
  // Remove Re:, Fwd:, etc. and trim for comparison
  return subject
    .replace(/^(re|fwd|fw):\s*/gi, '')
    .trim()
    .toLowerCase();
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

    console.log(`[list-emails] Searching for: "${query}" (timeframe: ${timeframeMonths} months)`);

    const convex = getConvexClient();

    // Get Gmail accounts for the family
    const gmailAccounts = await convex.query(api.gmailAccounts.getFamilyGmailAccounts, { familyId });

    if (!gmailAccounts || gmailAccounts.length === 0) {
      return NextResponse.json({ error: "No Gmail account connected" }, { status: 404 });
    }

    console.log(`[list-emails] Found ${gmailAccounts.length} Gmail account(s)`);

    const allEmails: any[] = [];

    // Search through all connected Gmail accounts
    for (const account of gmailAccounts) {
      try {
        console.log(`[list-emails] Searching account: ${account.gmailEmail}`);

        // Refresh access token
        const accessToken = await refreshAccessToken(account.refreshToken);

        // Initialize Gmail API
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Search Gmail with the user's query
        const searchDate = new Date(Date.now() - timeframeMonths * 30 * 24 * 60 * 60 * 1000);
        const searchQuery = `${query} after:${searchDate.toISOString().split('T')[0]}`;

        console.log(`[list-emails] Gmail search query: ${searchQuery}`);

        const response = await gmail.users.messages.list({
          userId: "me",
          q: searchQuery,
          maxResults: 50, // Get up to 50 emails
        });

        const messages = response.data.messages || [];
        console.log(`[list-emails] Found ${messages.length} matching emails`);

        // Get email metadata for each message
        for (const message of messages) {
          try {
            const msgData = await gmail.users.messages.get({
              userId: "me",
              id: message.id!,
              format: "metadata",
              metadataHeaders: ["Subject", "From", "Date"],
            });

            // Extract email metadata
            const headers = msgData.data.payload?.headers || [];
            const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
            const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "";
            const dateStr = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";

            // Parse date
            let date = new Date();
            try {
              date = new Date(dateStr);
            } catch (e) {
              console.error("Failed to parse date:", dateStr);
            }

            allEmails.push({
              id: message.id,
              subject: decodeHtmlEntities(subject),
              from: decodeHtmlEntities(from),
              date: date.toISOString(),
              snippet: decodeHtmlEntities(msgData.data.snippet || ""),
              accountEmail: account.gmailEmail,
            });
          } catch (error) {
            console.error(`[list-emails] Error getting message metadata:`, error);
            // Continue with next message
          }
        }
      } catch (error) {
        console.error(`[list-emails] Error searching account ${account.gmailEmail}:`, error);
        // Continue with next account
      }
    }

    // Sort by date (newest first)
    allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`[list-emails] Total emails found before deduplication: ${allEmails.length}`);

    // Deduplicate by subject (keep only first instance of each thread)
    const seenSubjects = new Set<string>();
    const deduplicatedEmails = allEmails.filter(email => {
      const normalizedSubject = normalizeSubject(email.subject);
      if (seenSubjects.has(normalizedSubject)) {
        return false; // Skip duplicate
      }
      seenSubjects.add(normalizedSubject);
      return true; // Keep first instance
    });

    console.log(`[list-emails] Emails after deduplication: ${deduplicatedEmails.length}`);

    return NextResponse.json({
      success: true,
      emails: deduplicatedEmails,
      totalFound: deduplicatedEmails.length,
    });
  } catch (error: any) {
    console.error("[list-emails] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to search emails",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
