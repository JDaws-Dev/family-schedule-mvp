import { v } from "convex/values";
import { internalAction, internalQuery, mutation, query } from "./_generated/server";
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

  // ERROR HANDLING - Check if refresh was successful
  if (!response.ok) {
    console.error("[Token Refresh] Failed to refresh access token:", {
      status: response.status,
      error: data.error,
      error_description: data.error_description,
    });
    throw new Error(`Token refresh failed: ${data.error_description || data.error || 'Unknown error'}`);
  }

  if (!data.access_token) {
    console.error("[Token Refresh] No access token in response:", data);
    throw new Error("Token refresh did not return an access token");
  }

  console.log("[Token Refresh] Successfully refreshed access token");
  return data.access_token;
}

/**
 * Calculate exponential backoff delay for retry attempts
 * Retry schedule: 1 min, 5 min, 15 min, 1 hour, 4 hours
 */
function getRetryDelay(retryCount: number): number {
  const delays = [
    1 * 60 * 1000,      // 1 minute
    5 * 60 * 1000,      // 5 minutes
    15 * 60 * 1000,     // 15 minutes
    60 * 60 * 1000,     // 1 hour
    4 * 60 * 60 * 1000, // 4 hours
  ];

  if (retryCount >= delays.length) {
    return 0; // No more retries
  }

  return delays[retryCount];
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
    isRetry: v.optional(v.boolean()), // Whether this is a retry attempt
  },
  handler: async (ctx, args) => {
    const MAX_RETRIES = 5;
    console.log(`[CALENDAR SYNC] Starting sync for event ID: ${args.eventId}${args.isRetry ? ' (RETRY)' : ''}`);

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

      console.log(`[CALENDAR SYNC] Retrieved event: ${event.title}, familyId: ${event.familyId}, isConfirmed: ${event.isConfirmed}, syncStatus: ${event.syncStatus}, retryCount: ${event.syncRetryCount || 0}`)

      // Check if we've exceeded max retries
      const retryCount = event.syncRetryCount || 0;
      if (retryCount >= MAX_RETRIES) {
        console.error(`[CALENDAR SYNC] Event ${args.eventId} has exceeded max retry attempts (${MAX_RETRIES})`);
        await ctx.runMutation(api.events.updateEvent, {
          eventId: args.eventId,
          syncStatus: "failed",
          syncError: `Maximum retry attempts (${MAX_RETRIES}) exceeded. Please manually retry sync.`,
          lastSyncAttempt: Date.now(),
        });
        return {
          success: false,
          error: "Max retries exceeded",
        };
      }

      // Update status to "syncing"
      await ctx.runMutation(api.events.updateEvent, {
        eventId: args.eventId,
        syncStatus: "syncing",
        lastSyncAttempt: Date.now(),
      });

      // If event already has a Google Calendar ID, it's already synced
      if (event.googleCalendarEventId) {
        console.log(`[CALENDAR SYNC] Event ${args.eventId} already has Google Calendar ID, marking as synced`);
        await ctx.runMutation(api.events.updateEvent, {
          eventId: args.eventId,
          syncStatus: "synced",
        });
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
        console.log(`[CALENDAR SYNC] Family ${event.familyId} has no Google Calendar configured, marking as synced (no calendar to sync to)`);
        // Mark as synced since there's nothing to sync to
        await ctx.runMutation(api.events.updateEvent, {
          eventId: args.eventId,
          syncStatus: "synced",
        });
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
        console.error(`[CALENDAR SYNC] No Gmail account connected for family ${event.familyId}, scheduling retry`);
        const newRetryCount = retryCount + 1;
        const retryDelay = getRetryDelay(newRetryCount);

        await ctx.runMutation(api.events.updateEvent, {
          eventId: args.eventId,
          syncStatus: "failed",
          syncError: "No Gmail account connected. Cannot add to Google Calendar.",
          syncRetryCount: newRetryCount,
        });

        // Schedule retry if we haven't exceeded max attempts
        if (retryDelay > 0) {
          console.log(`[CALENDAR SYNC] Scheduling retry ${newRetryCount} in ${retryDelay / 1000} seconds`);
          ctx.scheduler.runAfter(retryDelay, internal.calendarSync.syncEventToGoogleCalendar, {
            eventId: args.eventId,
            isRetry: true,
          });
        }

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

        const newRetryCount = retryCount + 1;
        const retryDelay = getRetryDelay(newRetryCount);

        await ctx.runMutation(api.events.updateEvent, {
          eventId: args.eventId,
          syncStatus: "failed",
          syncError: `Google Calendar API returned ${response.status}: ${errorText}`,
          syncRetryCount: newRetryCount,
        });

        // Schedule retry if we haven't exceeded max attempts
        if (retryDelay > 0) {
          console.log(`[CALENDAR SYNC] Scheduling retry ${newRetryCount} in ${retryDelay / 1000} seconds`);
          ctx.scheduler.runAfter(retryDelay, internal.calendarSync.syncEventToGoogleCalendar, {
            eventId: args.eventId,
            isRetry: true,
          });
        }

        return {
          success: false,
          error: `Google Calendar API returned ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();
      const googleCalendarEventId = result.id;

      console.log(`[CALENDAR SYNC] Event created in Google Calendar with ID: ${googleCalendarEventId}`);

      // Update the event in Convex with the Google Calendar ID, sync timestamp, and success status
      await ctx.runMutation(api.events.updateEvent, {
        eventId: args.eventId,
        googleCalendarEventId: googleCalendarEventId,
        lastSyncedAt: Date.now(),
        syncStatus: "synced",
        syncRetryCount: 0, // Reset retry count on success
      });

      console.log(`[CALENDAR SYNC] Successfully synced event ${args.eventId} to Google Calendar with ID ${googleCalendarEventId}${retryCount > 0 ? ` (after ${retryCount} ${retryCount === 1 ? 'retry' : 'retries'})` : ''}`);

      return {
        success: true,
        message: "Event synced to Google Calendar",
        googleCalendarEventId: googleCalendarEventId,
      };
    } catch (error: any) {
      // Log the error and schedule retry
      console.error(`[CALENDAR SYNC] ERROR syncing event ${args.eventId} to Google Calendar:`, error);
      console.error(`[CALENDAR SYNC] Error stack:`, error.stack);

      const newRetryCount = retryCount + 1;
      const retryDelay = getRetryDelay(newRetryCount);

      await ctx.runMutation(api.events.updateEvent, {
        eventId: args.eventId,
        syncStatus: "failed",
        syncError: error.message || "Unknown error",
        syncRetryCount: newRetryCount,
      });

      // Schedule retry if we haven't exceeded max attempts
      if (retryDelay > 0) {
        console.log(`[CALENDAR SYNC] Scheduling retry ${newRetryCount} in ${retryDelay / 1000} seconds after error: ${error.message}`);
        ctx.scheduler.runAfter(retryDelay, internal.calendarSync.syncEventToGoogleCalendar, {
          eventId: args.eventId,
          isRetry: true,
        });
      }

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

/**
 * Query to get all unsynced events (pending or failed) for a family
 */
export const getUnsyncedEvents = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_family_and_sync_status", (q) =>
        q.eq("familyId", args.familyId)
      )
      .collect();

    // Filter for events that need syncing (pending or failed, and confirmed)
    return events.filter(
      (event) =>
        event.isConfirmed &&
        (event.syncStatus === "pending" || event.syncStatus === "failed")
    );
  },
});

/**
 * Internal query to get all unsynced events across all families (for cron job)
 */
export const getAllUnsyncedEvents = internalQuery({
  args: {},
  handler: async (ctx) => {
    const pendingEvents = await ctx.db
      .query("events")
      .withIndex("by_sync_status", (q) => q.eq("syncStatus", "pending"))
      .collect();

    const failedEvents = await ctx.db
      .query("events")
      .withIndex("by_sync_status", (q) => q.eq("syncStatus", "failed"))
      .collect();

    // Only return confirmed events
    const allUnsynced = [...pendingEvents, ...failedEvents].filter(
      (event) => event.isConfirmed
    );

    return allUnsynced;
  },
});

/**
 * Mutation to manually retry sync for a specific event
 */
export const retrySyncForEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.isConfirmed) {
      throw new Error("Cannot sync unconfirmed events");
    }

    if (event.syncStatus === "synced") {
      return {
        success: true,
        message: "Event is already synced",
      };
    }

    // Reset retry count to allow fresh attempts
    await ctx.db.patch(args.eventId, {
      syncStatus: "pending",
      syncRetryCount: 0,
    });

    // Schedule immediate sync
    ctx.scheduler.runAfter(0, internal.calendarSync.syncEventToGoogleCalendar, {
      eventId: args.eventId,
      isRetry: false,
    });

    return {
      success: true,
      message: "Sync scheduled for event",
    };
  },
});

/**
 * Mutation to manually retry sync for all unsynced events in a family
 */
export const retrySyncForFamily = mutation({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_family_and_sync_status", (q) =>
        q.eq("familyId", args.familyId)
      )
      .collect();

    // Find all unsynced confirmed events
    const unsyncedEvents = events.filter(
      (event) =>
        event.isConfirmed &&
        (event.syncStatus === "pending" || event.syncStatus === "failed")
    );

    console.log(
      `[MANUAL SYNC] Found ${unsyncedEvents.length} unsynced events for family ${args.familyId}`
    );

    // Reset retry count and schedule sync for each
    for (const event of unsyncedEvents) {
      await ctx.db.patch(event._id, {
        syncStatus: "pending",
        syncRetryCount: 0,
      });

      // Schedule immediate sync
      ctx.scheduler.runAfter(0, internal.calendarSync.syncEventToGoogleCalendar, {
        eventId: event._id,
        isRetry: false,
      });
    }

    return {
      success: true,
      message: `Scheduled sync for ${unsyncedEvents.length} ${unsyncedEvents.length === 1 ? 'event' : 'events'}`,
      eventCount: unsyncedEvents.length,
    };
  },
});

/**
 * Internal action for background cron job to retry failed syncs
 */
export const backgroundSyncRetry = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[BACKGROUND SYNC] Starting background sync retry job");

    try {
      // Get all unsynced events
      const unsyncedEvents = await ctx.runQuery(
        internal.calendarSync.getAllUnsyncedEvents
      );

      console.log(
        `[BACKGROUND SYNC] Found ${unsyncedEvents.length} unsynced events`
      );

      let scheduledCount = 0;

      for (const event of unsyncedEvents) {
        const retryCount = event.syncRetryCount || 0;

        // Skip if max retries exceeded
        if (retryCount >= 5) {
          console.log(
            `[BACKGROUND SYNC] Skipping event ${event._id} - max retries exceeded`
          );
          continue;
        }

        // Check if enough time has passed since last attempt
        const lastAttempt = event.lastSyncAttempt || 0;
        const timeSinceLastAttempt = Date.now() - lastAttempt;
        const minWaitTime = getRetryDelay(retryCount - 1) || 0;

        if (timeSinceLastAttempt < minWaitTime) {
          console.log(
            `[BACKGROUND SYNC] Skipping event ${event._id} - not enough time since last attempt`
          );
          continue;
        }

        // Schedule sync
        ctx.scheduler.runAfter(0, internal.calendarSync.syncEventToGoogleCalendar, {
          eventId: event._id,
          isRetry: true,
        });

        scheduledCount++;
      }

      console.log(
        `[BACKGROUND SYNC] Scheduled ${scheduledCount} events for sync`
      );

      return {
        success: true,
        totalUnsynced: unsyncedEvents.length,
        scheduledForRetry: scheduledCount,
      };
    } catch (error: any) {
      console.error("[BACKGROUND SYNC] Error in background sync job:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});
