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
    console.log(`[CALENDAR SYNC] Starting sync for event ID: ${args.eventId}`);
    try {
      // Get the event details
      const event = await ctx.runQuery(api.events.getEventById, {
        eventId: args.eventId,
      });

      if (!event) {
        console.error(`[CALENDAR SYNC] Event ${args.eventId} not found, cannot sync to Google Calendar`);
        return {
          success: false,
          error: "Event not found",
        };
      }

      console.log(`[CALENDAR SYNC] Retrieved event: ${event.title}, familyId: ${event.familyId}, isConfirmed: ${event.isConfirmed}`)

      // If event already has a Google Calendar ID, it's already synced
      if (event.googleCalendarEventId) {
        console.log(`[CALENDAR SYNC] Event ${args.eventId} already has Google Calendar ID, skipping sync`);
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

      console.log(`[CALENDAR SYNC] Family data retrieved. googleCalendarId: ${family?.googleCalendarId}, calendarName: ${family?.calendarName}`);

      // Only sync if the family has a googleCalendarId configured
      if (!family?.googleCalendarId) {
        console.log(`[CALENDAR SYNC] Family ${event.familyId} has no Google Calendar configured, skipping sync for event ${args.eventId}`);
        return {
          success: true,
          message: "No Google Calendar configured for family, skipping sync",
        };
      }

      // Get a Gmail account for this family to use for Calendar API
      const gmailAccounts = await ctx.runQuery(api.gmailAccounts.getActiveGmailAccounts, {
        familyId: event.familyId,
      });

      console.log(`[CALENDAR SYNC] Found ${gmailAccounts?.length || 0} active Gmail accounts for family ${event.familyId}`);

      if (!gmailAccounts || gmailAccounts.length === 0) {
        console.error(`[CALENDAR SYNC] No Gmail account connected for family ${event.familyId}`);
        return {
          success: false,
          error: "No Gmail account connected. Cannot add to Google Calendar.",
        };
      }

      // Use the first active Gmail account
      const account = gmailAccounts[0];

      console.log(`[CALENDAR SYNC] Using Gmail account: ${account.gmailEmail}`);

      // Refresh access token
      console.log(`[CALENDAR SYNC] Refreshing access token...`);
      const accessToken = await refreshAccessToken(account.refreshToken);
      console.log(`[CALENDAR SYNC] Access token refreshed successfully`);

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

      console.log(`[CALENDAR SYNC] Adding event "${event.title}" to Google Calendar ${family.googleCalendarId}`);
      console.log(`[CALENDAR SYNC] Event data:`, JSON.stringify(calendarEvent));

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

      console.log(`[CALENDAR SYNC] Google Calendar API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CALENDAR SYNC] Failed to sync event ${args.eventId} to Google Calendar: ${response.status} ${errorText}`);
        return {
          success: false,
          error: `Google Calendar API returned ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();
      const googleCalendarEventId = result.id;

      console.log(`[CALENDAR SYNC] Event created in Google Calendar with ID: ${googleCalendarEventId}`);

      // Update the event in Convex with the Google Calendar ID and sync timestamp
      await ctx.runMutation(api.events.updateEvent, {
        eventId: args.eventId,
        googleCalendarEventId: googleCalendarEventId,
        lastSyncedAt: Date.now(),
      });

      console.log(`[CALENDAR SYNC] Successfully synced event ${args.eventId} to Google Calendar with ID ${googleCalendarEventId}`);

      return {
        success: true,
        message: "Event synced to Google Calendar",
        googleCalendarEventId: googleCalendarEventId,
      };
    } catch (error: any) {
      // Log the error but don't throw - we want the event creation to succeed even if sync fails
      console.error(`[CALENDAR SYNC] ERROR syncing event ${args.eventId} to Google Calendar:`, error);
      console.error(`[CALENDAR SYNC] Error stack:`, error.stack);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Internal action to update an existing event in Google Calendar
 * This is called via scheduler after an event is updated
 */
export const updateEventInGoogleCalendar = internalAction({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    console.log(`[CALENDAR SYNC UPDATE] Starting update sync for event ID: ${args.eventId}`);
    try {
      // Get the event details
      const event = await ctx.runQuery(api.events.getEventById, {
        eventId: args.eventId,
      });

      if (!event) {
        console.error(`[CALENDAR SYNC UPDATE] Event ${args.eventId} not found`);
        return {
          success: false,
          error: "Event not found",
        };
      }

      // If event doesn't have a Google Calendar ID, create it instead
      if (!event.googleCalendarEventId) {
        console.log(`[CALENDAR SYNC UPDATE] Event ${args.eventId} has no Google Calendar ID, creating instead`);
        return await ctx.runAction(internal.calendarSync.syncEventToGoogleCalendar, {
          eventId: args.eventId,
        });
      }

      // Get family to check if they have a googleCalendarId configured
      const family = await ctx.runQuery(api.families.getFamilyById, {
        familyId: event.familyId,
      });

      if (!family?.googleCalendarId) {
        console.log(`[CALENDAR SYNC UPDATE] Family ${event.familyId} has no Google Calendar configured, skipping sync`);
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
        console.error(`[CALENDAR SYNC UPDATE] No Gmail account connected for family ${event.familyId}`);
        return {
          success: false,
          error: "No Gmail account connected. Cannot update Google Calendar.",
        };
      }

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
          ? `${event.eventDate}T${event.eventTime}:00`
          : event.eventDate;

      // Build the updated calendar event
      const calendarEvent = {
        summary: event.title,
        description: event.description || "",
        location: event.location || "",
        start: event.eventTime ? {
          dateTime: startDateTime,
          timeZone: "America/New_York",
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

      console.log(`[CALENDAR SYNC UPDATE] Updating event "${event.title}" in Google Calendar ${family.googleCalendarId}`);

      // Call Google Calendar API to update the event
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(family.googleCalendarId)}/events/${encodeURIComponent(event.googleCalendarEventId)}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(calendarEvent),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CALENDAR SYNC UPDATE] Failed to update event ${args.eventId} in Google Calendar: ${response.status} ${errorText}`);
        return {
          success: false,
          error: `Google Calendar API returned ${response.status}: ${errorText}`,
        };
      }

      // Update the lastSyncedAt timestamp
      await ctx.runMutation(api.events.updateEvent, {
        eventId: args.eventId,
        lastSyncedAt: Date.now(),
      });

      console.log(`[CALENDAR SYNC UPDATE] Successfully updated event ${args.eventId} in Google Calendar`);

      return {
        success: true,
        message: "Event updated in Google Calendar",
      };
    } catch (error: any) {
      console.error(`[CALENDAR SYNC UPDATE] ERROR updating event ${args.eventId} in Google Calendar:`, error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Internal action to delete an event from Google Calendar
 * This is called via scheduler after an event is deleted
 */
export const deleteEventFromGoogleCalendar = internalAction({
  args: {
    familyId: v.id("families"),
    googleCalendarEventId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[CALENDAR SYNC DELETE] Starting delete sync for Google Calendar event ID: ${args.googleCalendarEventId}`);
    try {
      // Get family to check if they have a googleCalendarId configured
      const family = await ctx.runQuery(api.families.getFamilyById, {
        familyId: args.familyId,
      });

      if (!family?.googleCalendarId) {
        console.log(`[CALENDAR SYNC DELETE] Family ${args.familyId} has no Google Calendar configured, skipping delete`);
        return {
          success: true,
          message: "No Google Calendar configured for family, skipping delete",
        };
      }

      // Get a Gmail account for this family to use for Calendar API
      const gmailAccounts = await ctx.runQuery(api.gmailAccounts.getActiveGmailAccounts, {
        familyId: args.familyId,
      });

      if (!gmailAccounts || gmailAccounts.length === 0) {
        console.error(`[CALENDAR SYNC DELETE] No Gmail account connected for family ${args.familyId}`);
        return {
          success: false,
          error: "No Gmail account connected. Cannot delete from Google Calendar.",
        };
      }

      const account = gmailAccounts[0];

      // Refresh access token
      const accessToken = await refreshAccessToken(account.refreshToken);

      console.log(`[CALENDAR SYNC DELETE] Deleting event from Google Calendar ${family.googleCalendarId}`);

      // Call Google Calendar API to delete the event
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(family.googleCalendarId)}/events/${encodeURIComponent(args.googleCalendarEventId)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      // 204 No Content or 404 Not Found are both acceptable (event is gone)
      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        console.error(`[CALENDAR SYNC DELETE] Failed to delete event from Google Calendar: ${response.status} ${errorText}`);
        return {
          success: false,
          error: `Google Calendar API returned ${response.status}: ${errorText}`,
        };
      }

      console.log(`[CALENDAR SYNC DELETE] Successfully deleted event ${args.googleCalendarEventId} from Google Calendar`);

      return {
        success: true,
        message: "Event deleted from Google Calendar",
      };
    } catch (error: any) {
      console.error(`[CALENDAR SYNC DELETE] ERROR deleting event from Google Calendar:`, error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});
