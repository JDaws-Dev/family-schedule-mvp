import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all linked calendars for a family
 */
export const getLinkedCalendars = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const calendars = await ctx.db
      .query("linkedCalendars")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    return calendars.sort((a, b) => a.displayName.localeCompare(b.displayName));
  },
});

/**
 * Get a single linked calendar by ID
 */
export const getLinkedCalendar = query({
  args: { calendarId: v.id("linkedCalendars") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.calendarId);
  },
});

/**
 * Add a new linked calendar
 */
export const addLinkedCalendar = mutation({
  args: {
    familyId: v.id("families"),
    userId: v.id("users"),
    displayName: v.string(),
    actualCalendarName: v.optional(v.string()),
    category: v.union(
      v.literal("school"),
      v.literal("sports"),
      v.literal("church"),
      v.literal("activities"),
      v.literal("other")
    ),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const calendarId = await ctx.db.insert("linkedCalendars", {
      familyId: args.familyId,
      addedByUserId: args.userId,
      displayName: args.displayName,
      actualCalendarName: args.actualCalendarName,
      category: args.category,
      url: args.url,
      createdAt: now,
      updatedAt: now,
    });

    return calendarId;
  },
});

/**
 * Update a linked calendar
 */
export const updateLinkedCalendar = mutation({
  args: {
    calendarId: v.id("linkedCalendars"),
    displayName: v.optional(v.string()),
    category: v.optional(v.union(
      v.literal("school"),
      v.literal("sports"),
      v.literal("church"),
      v.literal("activities"),
      v.literal("other")
    )),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { calendarId, ...updates } = args;

    await ctx.db.patch(calendarId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a linked calendar
 */
export const deleteLinkedCalendar = mutation({
  args: { calendarId: v.id("linkedCalendars") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.calendarId);
    return { success: true };
  },
});

/**
 * Get count of linked calendars by category
 */
export const getLinkedCalendarStats = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const calendars = await ctx.db
      .query("linkedCalendars")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    const stats = {
      total: calendars.length,
      byCategory: {
        school: 0,
        sports: 0,
        church: 0,
        activities: 0,
        other: 0,
      },
    };

    calendars.forEach((cal) => {
      stats.byCategory[cal.category]++;
    });

    return stats;
  },
});
