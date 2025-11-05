import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Google Calendar Integration
 *
 * Strategy: Create a NEW dedicated "Family Activities" Google Calendar
 * - Separate from personal calendars
 * - Shared between Mom & Dad
 * - Syncs with native calendar apps (iPhone, Android, etc.)
 * - Two-way sync: Events can be added from website OR Google Calendar
 */

// Store Google Calendar info for each family
export const createFamilyCalendar = mutation({
  args: {
    familyId: v.id("families"),
    userId: v.id("users"),
    googleCalendarId: v.string(), // The calendar ID from Google
    calendarName: v.string(), // e.g., "Smith Family Activities"
  },
  handler: async (ctx, args) => {
    // Check if family already has a calendar
    const existing = await ctx.db
      .query("families")
      .filter((q) => q.eq(q.field("_id"), args.familyId))
      .first();

    if (!existing) {
      throw new Error("Family not found");
    }

    // Update family record with Google Calendar info
    await ctx.db.patch(args.familyId, {
      googleCalendarId: args.googleCalendarId,
      calendarName: args.calendarName,
    });

    return {
      success: true,
      googleCalendarId: args.googleCalendarId,
    };
  },
});

// Get family's Google Calendar info
export const getFamilyCalendar = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    const family = await ctx.db.get(args.familyId);

    if (!family) {
      return null;
    }

    return {
      googleCalendarId: family.googleCalendarId,
      calendarName: family.calendarName,
    };
  },
});

// Store mapping between our events and Google Calendar events
export const linkEventToGoogleCalendar = mutation({
  args: {
    eventId: v.id("events"),
    googleEventId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      googleCalendarEventId: args.googleEventId,
    });
  },
});

/**
 * Implementation Notes for Google Calendar API:
 *
 * 1. When user connects first Gmail account:
 *    - Use Google Calendar API to create new calendar: "Family Activities"
 *    - Store googleCalendarId in families table
 *    - Share calendar with spouse's email when they join
 *
 * 2. Event Creation Flow:
 *    - User/AI extracts event from email
 *    - Save to Convex database
 *    - Push to Google Calendar via API
 *    - Store googleCalendarEventId for two-way sync
 *
 * 3. Event Update Flow:
 *    - User edits event on website → update both Convex and Google Calendar
 *    - User edits in Google Calendar → webhook/polling updates Convex
 *
 * 4. Access:
 *    - Calendar automatically appears in:
 *      * Google Calendar app (Android)
 *      * iOS Calendar app (via Google account)
 *      * Gmail calendar widget
 *      * Any calendar app that syncs with Google
 *
 * 5. Permissions:
 *    - Primary user owns the calendar
 *    - Spouse gets "Make changes to events" permission
 *    - Both can add/edit/delete events
 */
