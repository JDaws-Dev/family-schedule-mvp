import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Helper function to refresh Google access token
 */
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

/**
 * Internal action to sync a newly created event to Google Calendar
 * This is called via scheduler after an event is created
 *
 * This action directly calls the Google Calendar API to create the event,
 * bypassing the need for Clerk authentication.
 */
export const syncEventToGoogleCalendar = internalAction({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    try {
      // Get the event details
      const event = await ctx.runQuery(api.events.getEventById, {
        eventId: args.eventId,
      });

      if (!event) {
        console.error(`Event ${args.eventId} not found, cannot sync to Google Calendar`);
        return {
          success: false,
          error: "Event not found",
        };
      }

      // If event already has a Google Calendar ID, it's already synced
      if (event.googleCalendarEventId) {
        console.log(`Event ${args.eventId} already has Google Calendar ID, skipping sync`);
        return {
          success: true,
          message: "Event already synced",
          googleCalendarEventId: event.googleCalendarEventId,
        };
      }

      // Get family to check if they have a googleCalendarId configured
      const family = await ctx.runQuery(api.families.getFamilyById, {
        familyId: event.familyId,
      });

      // Only sync if the family has a googleCalendarId configured
      if (!family?.googleCalendarId) {
        console.log(`Family ${event.familyId} has no Google Calendar configured, skipping sync for event ${args.eventId}`);
        return {
          success: true,
          message: "No Google Calendar configured for family, skipping sync",
        };
      }

      // Get a Gmail account for this family to use for Calendar API
      const gmailAccounts = await ctx.runQuery(api.gmailAccounts.getActiveGmailAccounts, {
        familyId: event.familyId,
      });

      if (!gmailAccounts || gmailAccounts.length === 0) {
        console.error(`No Gmail account connected for family ${event.familyId}`);
        return {
          success: false,
          error: "No Gmail account connected. Cannot add to Google Calendar.",
        };
      }

      // Use the first active Gmail account
      const account = gmailAccounts[0];

      // Refresh access token
      const accessToken = await refreshAccessToken(account.refreshToken);

      // Build start and end date/time
      const startDateTime = event.eventTime
        ? `${event.eventDate}T${event.eventTime}:00`
        : event.eventDate;

      const endDateTime = event.endTime
        ? `${event.eventDate}T${event.endTime}:00`
        : event.eventTime
          ? `${event.eventDate}T${event.eventTime}:00` // Default to same as start if only start time provided
          : event.eventDate;

      // Create event in Google Calendar
      const calendarEvent = {
        summary: event.title,
        description: event.description || "",
        location: event.location || "",
        start: event.eventTime ? {
          dateTime: startDateTime,
          timeZone: "America/New_York", // TODO: Make timezone configurable
        } : {
          date: event.eventDate,
        },
        end: event.eventTime ? {
          dateTime: endDateTime,
          timeZone: "America/New_York",
        } : {
          date: event.eventDate,
        },
      };

      console.log(`Adding event "${event.title}" to Google Calendar ${family.googleCalendarId}`);

      // Call Google Calendar API directly
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(family.googleCalendarId)}/events`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(calendarEvent),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to sync event ${args.eventId} to Google Calendar: ${response.status} ${errorText}`);
        return {
          success: false,
          error: `Google Calendar API returned ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();
      const googleCalendarEventId = result.id;

      // Update the event in Convex with the Google Calendar ID
      await ctx.runMutation(api.events.updateEvent, {
        eventId: args.eventId,
        googleCalendarEventId: googleCalendarEventId,
      });

      console.log(`Successfully synced event ${args.eventId} to Google Calendar with ID ${googleCalendarEventId}`);

      return {
        success: true,
        message: "Event synced to Google Calendar",
        googleCalendarEventId: googleCalendarEventId,
      };
    } catch (error: any) {
      // Log the error but don't throw - we want the event creation to succeed even if sync fails
      console.error(`Error syncing event ${args.eventId} to Google Calendar:`, error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});
