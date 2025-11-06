import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new suggested activity (AI discovers this)
export const createSuggestedActivity = mutation({
  args: {
    familyId: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    ageRange: v.optional(v.string()),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    priceRange: v.optional(v.string()),
    distance: v.optional(v.number()),
    rating: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const activityId = await ctx.db.insert("suggestedActivities", {
      ...args,
      status: "suggested",
      suggestedAt: Date.now(),
    });

    return activityId;
  },
});

// Get all suggested activities for a family
export const getSuggestedActivitiesByFamily = query({
  args: {
    familyId: v.id("families"),
    status: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("interested"),
        v.literal("dismissed"),
        v.literal("added")
      )
    ),
  },
  handler: async (ctx, args) => {
    let activities = await ctx.db
      .query("suggestedActivities")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    if (args.status) {
      activities = activities.filter((a) => a.status === args.status);
    }

    // Sort by suggested date (newest first)
    return activities.sort((a, b) => b.suggestedAt - a.suggestedAt);
  },
});

// Mark activity as interested
export const markAsInterested = mutation({
  args: {
    activityId: v.id("suggestedActivities"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.activityId, {
      status: "interested",
    });
  },
});

// Dismiss activity
export const dismissActivity = mutation({
  args: {
    activityId: v.id("suggestedActivities"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.activityId, {
      status: "dismissed",
      dismissedAt: Date.now(),
    });
  },
});

// Add activity to calendar (creates event)
export const addActivityToCalendar = mutation({
  args: {
    activityId: v.id("suggestedActivities"),
    userId: v.id("users"),
    eventDate: v.string(),
    eventTime: v.optional(v.string()),
    childName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get activity details
    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new Error("Activity not found");
    }

    // Get user's family ID
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create event
    const eventId = await ctx.db.insert("events", {
      familyId: user.familyId,
      createdByUserId: args.userId,
      title: activity.title,
      description: activity.description,
      eventDate: args.eventDate,
      eventTime: args.eventTime,
      location: activity.location,
      category: activity.category,
      childName: args.childName,
      isConfirmed: true, // User is manually adding, so auto-confirm
    });

    // Mark activity as added
    await ctx.db.patch(args.activityId, {
      status: "added",
    });

    return eventId;
  },
});

// Quick add activity to calendar using its existing date/time
export const quickAddToCalendar = mutation({
  args: {
    activityId: v.id("suggestedActivities"),
    userId: v.id("users"),
    childName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get activity details
    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new Error("Activity not found");
    }

    // Get user to get familyId
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create event using activity's date/time if available
    const eventId = await ctx.db.insert("events", {
      familyId: user.familyId,
      createdByUserId: args.userId,
      title: activity.title,
      description: activity.description,
      eventDate: activity.date || new Date().toISOString().split('T')[0], // Use activity date or today
      eventTime: activity.time,
      endTime: activity.endTime,
      location: activity.location,
      category: activity.category,
      childName: args.childName,
      isConfirmed: true, // Auto-confirm since user is explicitly adding
    });

    // Mark activity as added
    await ctx.db.patch(args.activityId, {
      status: "added",
    });

    return eventId;
  },
});

// Get activity by category
export const getActivitiesByCategory = query({
  args: {
    familyId: v.id("families"),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("suggestedActivities")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("category"), args.category))
      .filter((q) => q.eq(q.field("status"), "suggested"))
      .collect();

    return activities.sort((a, b) => b.suggestedAt - a.suggestedAt);
  },
});

/**
 * Implementation notes for AI Discovery:
 *
 * 1. Data Sources:
 *    - Google Places API for local businesses
 *    - Recreation.gov for community programs
 *    - Local government websites (parks & rec)
 *    - Eventbrite for classes/camps
 *    - Web scraping of local activity providers
 *
 * 2. AI Processing:
 *    - Use OpenAI to analyze business descriptions
 *    - Match against family profile (kids' ages, location, interests)
 *    - Generate personalized aiSummary explaining why it's a good fit
 *
 * 3. Scheduling:
 *    - Run discovery job weekly
 *    - Update existing activities (check for closures, price changes)
 *    - Deduplicate based on address/phone/website
 *
 * 4. Personalization Factors:
 *    - Distance from family's location
 *    - Kids' ages match activity age range
 *    - Price range matches family preferences
 *    - Category matches family interests
 *    - Schedule compatibility (e.g., avoid Monday if already busy)
 */
