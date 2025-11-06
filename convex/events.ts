import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new event (family-based)
export const createEvent = mutation({
  args: {
    createdByUserId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    eventDate: v.string(),
    eventTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    category: v.optional(v.string()),
    childName: v.optional(v.string()),
    sourceEmailId: v.optional(v.string()),
    sourceEmailSubject: v.optional(v.string()),
    requiresAction: v.optional(v.boolean()),
    actionDeadline: v.optional(v.string()),
    isConfirmed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get user's family ID
    const user = await ctx.db.get(args.createdByUserId);
    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.insert("events", {
      familyId: user.familyId,
      createdByUserId: args.createdByUserId,
      title: args.title,
      description: args.description,
      eventDate: args.eventDate,
      eventTime: args.eventTime,
      endTime: args.endTime,
      location: args.location,
      category: args.category,
      childName: args.childName,
      sourceEmailId: args.sourceEmailId,
      sourceEmailSubject: args.sourceEmailSubject,
      requiresAction: args.requiresAction,
      actionDeadline: args.actionDeadline,
      isConfirmed: args.isConfirmed ?? false,
    });
  },
});

// Create an unconfirmed event (from email scanning)
export const createUnconfirmedEvent = mutation({
  args: {
    familyId: v.id("families"),
    createdByUserId: v.id("users"),
    sourceGmailAccountId: v.optional(v.id("gmailAccounts")),
    title: v.string(),
    eventDate: v.string(),
    eventTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    childName: v.optional(v.string()),
    requiresAction: v.optional(v.boolean()),
    actionDeadline: v.optional(v.string()),
    sourceEmailId: v.optional(v.string()),
    sourceEmailSubject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate events (same title, date, and family member)
    // This prevents duplicate extraction from multiple similar emails
    const existingEvents = await ctx.db
      .query("events")
      .withIndex("by_family_and_date", (q) =>
        q.eq("familyId", args.familyId).eq("eventDate", args.eventDate)
      )
      .collect();

    // Helper function to normalize strings for comparison
    const normalize = (str: string | undefined) =>
      (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    // Helper function to calculate similarity between two strings (0-1)
    const similarity = (str1: string, str2: string) => {
      const s1 = normalize(str1);
      const s2 = normalize(str2);
      if (s1 === s2) return 1;

      // Check if one string contains the other (e.g., "dental appointment" in "michelles dental appointment")
      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length > s2.length ? s2 : s1;
      if (longer.length === 0) return 1.0;

      // If shorter is fully contained in longer, high similarity
      if (longer.includes(shorter)) {
        return Math.max(0.85, shorter.length / longer.length);
      }

      // Levenshtein-like distance for better matching
      const maxLength = Math.max(s1.length, s2.length);
      let distance = 0;
      for (let i = 0; i < maxLength; i++) {
        if (s1[i] !== s2[i]) distance++;
      }
      return 1 - (distance / maxLength);
    };

    // Helper to check if times are within 1 hour of each other
    const timesAreSimilar = (time1: string | undefined, time2: string | undefined) => {
      if (!time1 || !time2) return time1 === time2; // Both undefined = similar

      const [h1, m1] = time1.split(":").map(Number);
      const [h2, m2] = time2.split(":").map(Number);

      const minutes1 = h1 * 60 + m1;
      const minutes2 = h2 * 60 + m2;

      return Math.abs(minutes1 - minutes2) <= 60; // Within 1 hour
    };

    const duplicate = existingEvents.find(
      (event) => {
        // Exact match
        if (event.title === args.title && event.childName === args.childName) {
          return true;
        }

        // Fuzzy match: similar title (>80% similar), same child, similar time
        const titleSimilarity = similarity(event.title, args.title);
        const sameChild = event.childName === args.childName;
        const similarTime = timesAreSimilar(event.eventTime, args.eventTime);

        return titleSimilarity > 0.8 && sameChild && similarTime;
      }
    );

    if (duplicate) {
      console.log(`Skipping duplicate event: ${args.title} on ${args.eventDate} for ${args.childName} (matched with: ${duplicate.title})`);
      return duplicate._id; // Return existing event ID instead of creating duplicate
    }

    return await ctx.db.insert("events", {
      familyId: args.familyId,
      createdByUserId: args.createdByUserId,
      sourceGmailAccountId: args.sourceGmailAccountId,
      title: args.title,
      eventDate: args.eventDate,
      eventTime: args.eventTime,
      endTime: args.endTime,
      location: args.location,
      description: args.description,
      category: args.category,
      childName: args.childName,
      requiresAction: args.requiresAction,
      actionDeadline: args.actionDeadline,
      sourceEmailId: args.sourceEmailId,
      sourceEmailSubject: args.sourceEmailSubject,
      isConfirmed: false,
    });
  },
});

// Get all events for a family
export const getEventsByFamily = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

// Get events for a specific date range (family-based)
export const getEventsByDateRange = query({
  args: {
    familyId: v.id("families"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    return events.filter(
      (event) => event.isConfirmed && event.eventDate >= args.startDate && event.eventDate <= args.endDate
    );
  },
});

// Get unconfirmed events (for review) - family-based
export const getUnconfirmedEvents = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    return events.filter((event) => !event.isConfirmed);
  },
});

// Update an event
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    eventDate: v.optional(v.string()),
    eventTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    category: v.optional(v.string()),
    childName: v.optional(v.string()),
    requiresAction: v.optional(v.boolean()),
    actionDeadline: v.optional(v.string()),
    isConfirmed: v.optional(v.boolean()),
    googleCalendarEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { eventId, ...updates } = args;
    await ctx.db.patch(eventId, updates);
  },
});

// Confirm an event
export const confirmEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, { isConfirmed: true });
  },
});

// Delete an event
export const deleteEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.eventId);
  },
});

// Get upcoming events (next 7 days) - family-based
export const getUpcomingEvents = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const events = await ctx.db
      .query("events")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    return events
      .filter((event) => event.isConfirmed && event.eventDate >= today && event.eventDate <= weekFromNow)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  },
});

// Get confirmed events only - family-based
export const getConfirmedEvents = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    return events.filter((event) => event.isConfirmed);
  },
});

// Get event by ID
export const getEventById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});
