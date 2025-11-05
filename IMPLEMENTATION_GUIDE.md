# FamilySchedule: Fully Automatic Weekend Implementation Guide

**Goal:** Automatic email scanning → AI event detection → User approval → Calendar sync via iCal

**No manual forwarding. Fully automatic.**

---

## Prerequisites

### 1. Google Cloud Console Setup (15 min)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "FamilySchedule"
3. Enable **Gmail API**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback`
     - `https://yourdomain.com/api/auth/google/callback`
   - Copy **Client ID** and **Client Secret**

### 2. Clerk Setup (10 min)
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create new application: "FamilySchedule"
3. Copy **Publishable Key** and **Secret Key**
4. Enable Email/Password authentication

### 3. Convex Setup (10 min)
1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Create new project: "FamilySchedule"
3. Run: `npx convex dev` (follow prompts)
4. Copy **Deployment URL**

### 4. OpenAI Setup (5 min)
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create account or log in
3. Go to API Keys section
4. Create new secret key
5. Copy key (starts with `sk-...`)
6. **Recommended:** Set usage limits ($5-10/month is plenty for MVP)

---

## Environment Variables

Create `.env.local`:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud
CONVEX_DEPLOYMENT=...

# Gmail OAuth
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI (for email parsing)
OPENAI_API_KEY=sk-...

# Optional: For production
# CRON_SECRET=generate-random-string-here
```

---

## Implementation Steps

### **Saturday Morning: Database & Auth (3-4 hours)**

#### Step 1: Setup Convex Schema

Create `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  households: defineTable({
    name: v.string(),
    timezone: v.string(),
    icalToken: v.string(),
  }).index("by_token", ["icalToken"]),

  memberships: defineTable({
    householdId: v.id("households"),
    userId: v.string(), // Clerk userId
    role: v.union(v.literal("owner"), v.literal("guardian")),
  })
    .index("by_user", ["userId"])
    .index("by_household", ["householdId"]),

  children: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    birthdate: v.optional(v.string()),
    grade: v.optional(v.string()),
    nicknames: v.optional(v.array(v.string())),
  }).index("by_household", ["householdId"]),

  gmailAccounts: defineTable({
    householdId: v.id("households"),
    email: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    lastSyncedAt: v.optional(v.number()),
    lastHistoryId: v.optional(v.string()), // For incremental syncing
  })
    .index("by_household", ["householdId"])
    .index("by_email", ["email"]),

  events: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    startAt: v.string(),
    endAt: v.optional(v.string()),
    location: v.optional(v.string()),
    childId: v.optional(v.id("children")),
    status: v.union(v.literal("confirmed"), v.literal("tentative")),
    sourceType: v.literal("gmail"),
    dedupeKey: v.string(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_status", ["householdId", "status"])
    .index("by_dedupe", ["dedupeKey"]),

  reviewItems: defineTable({
    householdId: v.id("households"),
    rawId: v.string(),
    title: v.string(),
    startAt: v.string(),
    endAt: v.optional(v.string()),
    location: v.optional(v.string()),
    childName: v.optional(v.string()),
    confidence: v.number(),
    state: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    dedupeKey: v.string(),
  })
    .index("by_household_state", ["householdId", "state"])
    .index("by_rawId", ["rawId"])
    .index("by_dedupe", ["dedupeKey"]),
});
```

Run: `npx convex dev` to deploy schema.

#### Step 2: Setup Clerk

Install Clerk:
```bash
npm install @clerk/nextjs
```

Create `middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/calendar(.*)',
  '/review(.*)',
  '/settings(.*)',
  '/discover(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

Update `app/layout.tsx`:

```typescript
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

---

### **Saturday Afternoon: Gmail OAuth (4-5 hours)**

#### Step 3: Gmail OAuth Flow

Create `app/api/auth/google/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  googleAuthUrl.searchParams.set(
    "redirect_uri",
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/gmail.readonly"
  );
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "consent");
  googleAuthUrl.searchParams.set("state", userId);

  return NextResponse.redirect(googleAuthUrl.toString());
}
```

Create `app/api/auth/google/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const userId = req.nextUrl.searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(
      new URL("/settings?error=auth_failed", req.url)
    );
  }

  // Exchange code for tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();

  // Get Gmail address
  const profileResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }
  );
  const profile = await profileResponse.json();

  // Store in Convex
  await fetchMutation(api.gmail.connectAccount, {
    userId,
    email: profile.email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });

  return NextResponse.redirect(
    new URL("/settings?gmail_connected=true", req.url)
  );
}
```

#### Step 4: Gmail Scanning Action

Create `convex/gmail.ts`:

```typescript
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { google } from "googleapis";

export const scanAllAccounts = action({
  args: {},
  handler: async (ctx) => {
    // Get all Gmail accounts
    const accounts = await ctx.runQuery(api.gmail.getAllAccounts);

    for (const account of accounts) {
      try {
        await ctx.runAction(api.gmail.scanAccount, {
          accountId: account._id,
        });
      } catch (error) {
        console.error(`Failed to scan ${account.email}:`, error);
      }
    }
  },
});

export const scanAccount = action({
  args: { accountId: v.id("gmailAccounts") },
  handler: async (ctx, args) => {
    const account = await ctx.runQuery(api.gmail.getAccount, {
      id: args.accountId,
    });
    if (!account) return;

    // Refresh token if expired
    if (account.expiresAt < Date.now()) {
      const newTokens = await refreshAccessToken(account.refreshToken);
      await ctx.runMutation(api.gmail.updateTokens, {
        id: args.accountId,
        accessToken: newTokens.access_token,
        expiresAt: Date.now() + newTokens.expires_in * 1000,
      });
      account.accessToken = newTokens.access_token;
    }

    // Setup Gmail API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: account.accessToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Search for activity-related emails (last 7 days)
    const oneWeekAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const query = [
      "subject:(practice OR rehearsal OR game OR recital OR lesson OR class OR tryout OR meeting)",
      `after:${oneWeekAgo}`,
    ].join(" ");

    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50,
    });

    const messages = response.data.messages || [];

    for (const message of messages) {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      });

      // Extract event data
      const eventData = await extractEventFromEmail(msg.data);

      if (eventData) {
        await ctx.runMutation(api.ingest.upsertReviewItem, {
          householdId: account.householdId,
          rawId: `gmail-${message.id}`,
          ...eventData,
        });
      }
    }

    // Update last synced
    await ctx.runMutation(api.gmail.updateLastSync, {
      id: args.accountId,
      timestamp: Date.now(),
    });
  },
});

// Helper: Extract event data from email using OpenAI
async function extractEventFromEmail(message: any): Promise<any | null> {
  const headers = message.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
  const from = headers.find((h: any) => h.name === "From")?.value || "";

  // Get email body
  let body = "";
  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
  } else if (message.payload?.parts) {
    const textPart = message.payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }
  }

  // Truncate long emails
  const emailText = `Subject: ${subject}\nFrom: ${from}\n\n${body}`.slice(0, 2000);

  // Call OpenAI for structured extraction
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
          content: "Extract event information from emails. Return JSON with: title (string), date (YYYY-MM-DD), time (HH:MM), endTime (HH:MM, optional), location (string, optional), childName (string, optional), confidence (0-1). If no clear event, return null.",
        },
        {
          role: "user",
          content: emailText,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);

  if (!parsed || !parsed.title || !parsed.date) return null;

  // Format to ISO datetime
  const startAt = `${parsed.date}T${parsed.time || "00:00"}`;
  const endAt = parsed.endTime ? `${parsed.date}T${parsed.endTime}` : undefined;

  return {
    title: parsed.title,
    startAt,
    endAt,
    location: parsed.location,
    childName: parsed.childName,
    confidence: parsed.confidence || 0.7,
    dedupeKey: `${parsed.title}-${startAt}`.toLowerCase().replace(/\s+/g, "-"),
  };
}

// Helper: Refresh access token
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  return response.json();
}

// Mutations
export const connectAccount = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!membership) throw new Error("No household found");

    const existing = await ctx.db
      .query("gmailAccounts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("gmailAccounts", {
      householdId: membership.householdId,
      email: args.email,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
    });
  },
});

export const getAccount = query({
  args: { id: v.id("gmailAccounts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getAllAccounts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("gmailAccounts").collect();
  },
});

export const updateTokens = mutation({
  args: {
    id: v.id("gmailAccounts"),
    accessToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      accessToken: args.accessToken,
      expiresAt: args.expiresAt,
    });
  },
});

export const updateLastSync = mutation({
  args: { id: v.id("gmailAccounts"), timestamp: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastSyncedAt: args.timestamp });
  },
});
```

---

### **Sunday Morning: Cron Job + iCal (3-4 hours)**

#### Step 5: Automatic Daily Scanning

Create `app/api/cron/scan-emails/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel Cron Jobs)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await fetchAction(api.gmail.scanAllAccounts, {});

  return NextResponse.json({ success: true });
}
```

Add to `vercel.json` (for Vercel deployment):

```json
{
  "crons": [
    {
      "path": "/api/cron/scan-emails",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

For local testing, add a manual trigger button in Settings.

#### Step 6: iCal Feed Generation

Create `app/api/ical/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import ics from "ics";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const household = await fetchQuery(api.households.byToken, { token });

  if (!household) {
    return new NextResponse("Invalid token", { status: 404 });
  }

  const events = await fetchQuery(api.events.confirmedForHousehold, {
    householdId: household._id,
  });

  const icsEvents = events.map((e: any) => ({
    title: e.title,
    start: parseISOToArray(e.startAt),
    end: e.endAt ? parseISOToArray(e.endAt) : undefined,
    location: e.location,
    uid: e._id,
  }));

  const { error, value } = ics.createEvents(icsEvents);

  if (error) {
    return new NextResponse("Calendar error", { status: 500 });
  }

  return new NextResponse(value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "max-age=180",
    },
  });
}

function parseISOToArray(iso: string): [number, number, number, number, number] {
  const d = new Date(iso);
  return [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
  ];
}
```

---

### **Sunday Afternoon: Polish UI (3-4 hours)**

#### Step 7: Update Settings Page

Add Gmail connection section to `app/settings/page.tsx`:

```typescript
// Add to existing Settings page after Children Management section

{/* Gmail Accounts Section */}
<div className="bg-white rounded-lg shadow mb-8">
  <div className="p-6 border-b border-gray-200">
    <h2 className="text-xl font-bold text-gray-900">Gmail Accounts</h2>
    <p className="text-sm text-gray-600 mt-1">
      Connect Gmail to automatically scan for activity emails
    </p>
  </div>
  <div className="p-6">
    {/* Connected accounts list */}
    <div className="space-y-3 mb-6">
      {gmailAccounts.map((account) => (
        <div key={account._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white">
              📧
            </div>
            <div>
              <div className="font-semibold text-gray-900">{account.email}</div>
              <div className="text-sm text-gray-600">
                Last scanned: {account.lastSyncedAt
                  ? new Date(account.lastSyncedAt).toLocaleString()
                  : "Never"}
              </div>
            </div>
          </div>
          <button
            onClick={() => triggerManualScan(account._id)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Scan Now
          </button>
        </div>
      ))}
    </div>

    {/* Connect Gmail button */}
    <a
      href="/api/auth/google"
      className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
    >
      <span className="text-xl">+</span>
      Connect Gmail Account
    </a>
    <p className="text-xs text-gray-500 text-center mt-2">
      We scan your inbox daily for activity emails. No manual forwarding needed.
    </p>
  </div>
</div>

{/* iCal Feed Section */}
<div className="bg-white rounded-lg shadow">
  <div className="p-6 border-b border-gray-200">
    <h2 className="text-xl font-bold text-gray-900">Calendar Feed (iCal)</h2>
    <p className="text-sm text-gray-600 mt-1">
      Subscribe to your family calendar in any app
    </p>
  </div>
  <div className="p-6">
    <p className="text-sm text-gray-600 mb-4">
      Copy this URL into Google Calendar, Apple Calendar, Outlook, or any calendar app:
    </p>
    <div className="flex gap-2 mb-4">
      <input
        type="text"
        value={icalUrl}
        readOnly
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
      />
      <button
        onClick={() => {
          navigator.clipboard.writeText(icalUrl);
          alert("Copied!");
        }}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        Copy
      </button>
    </div>
    <button
      onClick={regenerateIcalToken}
      className="text-sm text-red-600 hover:text-red-700"
    >
      Regenerate URL (for security)
    </button>
  </div>
</div>
```

---

## **How It Works (User Experience)**

1. **User signs up** → Creates household automatically
2. **User adds children** → Names stored for event matching
3. **User clicks "Connect Gmail"** → OAuth flow → Gmail connected
4. **Automatic daily scan** (via cron job):
   - Scans last 7 days of emails
   - Extracts events using OpenAI (title, date, time, location, child)
   - Adds to Review queue with confidence score
5. **User visits Review page** → Sees pending events
6. **User approves event** → Moves to calendar
7. **User subscribes to iCal URL** → Events sync automatically to their phone/computer

---

## **Testing Checklist**

- [ ] User can sign up with Clerk
- [ ] User can connect Gmail
- [ ] Manual "Scan Now" button works
- [ ] Events appear in Review queue
- [ ] Approve button moves event to calendar
- [ ] iCal URL returns valid .ics file
- [ ] Events show up in Google/Apple Calendar

---

## **Production Deployment**

1. Deploy to Vercel
2. Add production URLs to:
   - Google OAuth redirect URIs
   - Clerk allowed origins
   - Environment variables
3. Enable Vercel Cron Jobs (automatic)
4. Monitor logs for scanning errors

---

## **Future Enhancements (Post-MVP)**

- Recurring event detection
- Multi-event extraction from single email
- Weekly digest emails
- Activity discovery with local search
- Automatic calendar conflict detection

---

## **Cost Breakdown**

- Clerk: $0-25/month (free tier → pro)
- Convex: $0-25/month (free tier → launch)
- Vercel: $0-20/month (free tier → pro)
- Gmail API: **FREE** (no quota limits for read-only)
- OpenAI: ~$2-5/month for GPT-4o-mini (500 emails = ~$2.50)

**Total MVP cost: $2-25/month** (can start on free tiers = ~$2-5/month)

---

**Let's build this! 🚀**
