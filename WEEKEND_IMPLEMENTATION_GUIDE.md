# Weekend Implementation Guide

This guide breaks down exactly what to build and in what order for your weekend MVP.

## Current Status: Friday Night Complete ✅

You have:
- ✅ Beautiful mom-focused landing page with FAQ
- ✅ Clerk authentication setup
- ✅ Convex database schema
- ✅ Project structure ready
- ✅ Development server running

## Saturday Morning: Gmail Integration (4-5 hours)

### Step 1: Create Gmail OAuth Flow

Create `/app/api/auth/google/route.ts`:

```typescript
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_REDIRECT_URI
);

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    // Step 1: Redirect to Google for authorization
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
      state: userId,
    });
    return NextResponse.redirect(authUrl);
  }

  // Step 2: Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);

  // Step 3: Save tokens to Convex (implement API route)
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/users/save-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    }),
  });

  return NextResponse.redirect('/dashboard');
}
```

### Step 2: Create Dashboard with Gmail Connect Button

Create `/app/dashboard/page.tsx`:

```typescript
'use client';

import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';

export default function Dashboard() {
  const { user } = useUser();
  const userData = useQuery(api.users.getUserByClerkId, {
    clerkId: user?.id || '',
  });

  const isGmailConnected = userData?.gmailAccessToken;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Welcome, {user?.firstName}!</h1>

        {!isGmailConnected ? (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Connect Your Gmail</h2>
            <p className="mb-4">
              Let's scan your email to find all your kids' activities.
            </p>
            <a
              href="/api/auth/google"
              className="bg-rose-600 text-white px-6 py-3 rounded-lg hover:bg-rose-700"
            >
              Connect Gmail
            </a>
          </div>
        ) : (
          <div className="bg-green-50 p-4 rounded-lg mb-8">
            ✓ Gmail connected! Ready to scan emails.
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 3: Email Fetching Function

Create `/app/api/emails/fetch/route.ts`:

```typescript
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's tokens from Convex
  const userData = await fetchFromConvex(`/users/${userId}`);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: userData.gmailAccessToken,
    refresh_token: userData.gmailRefreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Fetch emails from last 30 days with keywords
  const query = 'after:30d (soccer OR practice OR lesson OR recital OR game OR class)';

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  });

  const messages = response.data.messages || [];

  // Return message IDs for processing
  return NextResponse.json({ messageIds: messages.map(m => m.id) });
}
```

## Saturday Afternoon: AI Event Extraction (4-5 hours)

### Step 4: OpenAI Event Extraction

Create `/app/api/events/extract/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_PROMPT = `You are an expert at extracting children's activity information from emails.

Extract the following information from this email:
- Event title (e.g., "Soccer Practice", "Piano Lesson")
- Date (in YYYY-MM-DD format)
- Time (in HH:MM format, 24-hour)
- End time (if mentioned)
- Location/Address
- Child's name (if mentioned)
- Category (sports, lessons, appointments, school, other)
- Whether action is required (registration, payment, RSVP, etc.)
- Action deadline (if applicable)

Return a JSON object with these fields. If a field is not found, use null.
If multiple events are in the email, return an array of events.

Email content:
{email_content}`;

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { emailContent, emailSubject, emailId } = await request.json();

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You extract children\'s activity events from emails and return structured JSON.',
      },
      {
        role: 'user',
        content: EXTRACTION_PROMPT.replace('{email_content}',
          `Subject: ${emailSubject}\n\n${emailContent}`
        ),
      },
    ],
    response_format: { type: 'json_object' },
  });

  const extractedData = JSON.parse(response.choices[0].message.content || '{}');

  return NextResponse.json({
    events: Array.isArray(extractedData.events)
      ? extractedData.events
      : [extractedData],
    sourceEmailId: emailId,
    sourceEmailSubject: emailSubject,
  });
}
```

### Step 5: Event Review UI

Create `/app/dashboard/review/page.tsx`:

```typescript
'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';

export default function ReviewEvents() {
  const { user } = useUser();
  const unconfirmedEvents = useQuery(api.events.getUnconfirmedEvents, {
    userId: user?.id || '',
  });

  const confirmEvent = useMutation(api.events.confirmEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Review Extracted Events</h1>

      {unconfirmedEvents?.map((event) => (
        <div key={event._id} className="bg-white p-6 rounded-lg shadow mb-4">
          <h3 className="text-xl font-semibold">{event.title}</h3>
          <p className="text-gray-600">
            {event.eventDate} at {event.eventTime}
          </p>
          {event.location && <p>📍 {event.location}</p>}
          {event.childName && <p>👤 {event.childName}</p>}

          <div className="mt-4 flex gap-4">
            <button
              onClick={() => confirmEvent({ eventId: event._id })}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              ✓ Confirm
            </button>
            <button
              onClick={() => deleteEvent({ eventId: event._id })}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              ✗ Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Sunday Morning: Calendar & Payments (4-5 hours)

### Step 6: Simple Calendar View

Install calendar library:
```bash
npm install react-big-calendar date-fns
```

Create `/app/calendar/page.tsx`:

```typescript
'use client';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';

const locales = { 'en-US': require('date-fns/locale/en-US') };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function CalendarView() {
  const { user } = useUser();
  const events = useQuery(api.events.getEventsByUser, {
    userId: user?.id || '',
  });

  const calendarEvents = events?.map(event => ({
    title: event.title,
    start: new Date(`${event.eventDate}T${event.eventTime || '00:00'}`),
    end: new Date(`${event.eventDate}T${event.endTime || '23:59'}`),
    resource: event,
  })) || [];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Family Calendar</h1>
      <div className="bg-white p-4 rounded-lg shadow" style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
```

### Step 7: Stripe Subscription

Create `/app/api/checkout/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
    metadata: {
      userId,
    },
    subscription_data: {
      trial_period_days: 7,
    },
  });

  return NextResponse.json({ url: session.url });
}
```

## Sunday Afternoon: Reminders (4-5 hours)

### Step 8: Reminder Sending Service

Create `/convex/reminders.ts`:

```typescript
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Get events that need reminders
export const getEventsNeedingReminders = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    const events = await ctx.db.query("events").collect();

    // Filter events happening in the next 24 hours that haven't been reminded
    return events.filter(event => {
      const eventTime = new Date(`${event.eventDate}T${event.eventTime}`).getTime();
      const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);
      return hoursUntilEvent > 0 && hoursUntilEvent <= 24;
    });
  },
});

// Send reminder via cron job
export const sendReminders = internalMutation({
  handler: async (ctx) => {
    const events = await getEventsNeedingReminders(ctx);

    for (const event of events) {
      const user = await ctx.db.get(event.userId);
      const prefs = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", q => q.eq("userId", event.userId))
        .first();

      if (prefs?.emailRemindersEnabled) {
        // Send email reminder (call API route)
      }

      if (prefs?.smsRemindersEnabled) {
        // Send SMS reminder (call API route)
      }

      // Log reminder sent
      await ctx.db.insert("remindersSent", {
        userId: event.userId,
        eventId: event._id,
        reminderType: prefs?.smsRemindersEnabled ? "sms" : "email",
        status: "sent",
      });
    }
  },
});
```

### Step 9: Email Reminder API

Create `/app/api/reminders/email/route.ts`:

```typescript
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { email, event } = await request.json();

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `Reminder: ${event.title}`,
    html: `
      <h2>Don't forget!</h2>
      <p><strong>${event.title}</strong></p>
      <p>📅 ${event.eventDate} at ${event.eventTime}</p>
      ${event.location ? `<p>📍 ${event.location}</p>` : ''}
      ${event.childName ? `<p>👤 ${event.childName}</p>` : ''}
    `,
  });

  return NextResponse.json({ success: true });
}
```

### Step 10: SMS Reminder API

Create `/app/api/reminders/sms/route.ts`:

```typescript
import twilio from 'twilio';
import { NextResponse } from 'next/server';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: Request) {
  const { phoneNumber, event } = await request.json();

  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
    body: `Reminder: ${event.title} today at ${event.eventTime}${event.location ? ` at ${event.location}` : ''}`,
  });

  return NextResponse.json({ success: true });
}
```

## Deployment Checklist

### 1. Deploy Convex
```bash
npx convex deploy
```

### 2. Deploy to Vercel
```bash
vercel
```

### 3. Update Environment Variables
- Add all .env.local variables to Vercel
- Update redirect URIs with production domain
- Switch Stripe to live mode

### 4. Test Production
- [ ] Sign up flow works
- [ ] Gmail connection works
- [ ] Email scanning works
- [ ] Events appear in calendar
- [ ] Stripe payment works
- [ ] Reminders send correctly

## Quick Wins for Extra Features

If you finish early, add these:
1. **Manual event creation form** (30 min)
2. **Event editing** (45 min)
3. **Color coding by child** (30 min)
4. **Weekly digest email** (1 hour)
5. **Mobile responsive improvements** (1 hour)

## Notes

- **Don't over-engineer!** Get it working first, optimize later
- **Test with real emails** - use your own Gmail for testing
- **Keep AI costs low** - cache responses, batch process
- **Use trial accounts** - Twilio trial for testing SMS
- **Focus on UX** - Every screen should be mom-friendly and clear

Remember: A working MVP that solves the core problem is better than a perfect app that never launches!
