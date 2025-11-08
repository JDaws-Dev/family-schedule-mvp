import { v } from "convex/values";
import { mutation, query, action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Helper to convert null to undefined for Convex schema compatibility
function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Save AI-discovered activities to the database
 * This is called after scraping and AI matching
 */
export const saveDiscoveredActivities = mutation({
  args: {
    familyId: v.id("families"),
    activities: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.union(v.string(), v.null())),
        category: v.string(),
        type: v.optional(v.union(v.literal("event"), v.literal("place"), v.null())),
        // Event fields
        date: v.optional(v.union(v.string(), v.null())),
        time: v.optional(v.union(v.string(), v.null())),
        endTime: v.optional(v.union(v.string(), v.null())),
        recurring: v.optional(v.union(v.boolean(), v.null())),
        registrationRequired: v.optional(v.union(v.boolean(), v.null())),
        registrationDeadline: v.optional(v.union(v.string(), v.null())),
        // Place fields
        hoursOfOperation: v.optional(v.union(v.string(), v.null())),
        admission: v.optional(v.union(v.string(), v.null())),
        amenities: v.optional(v.union(v.array(v.string()), v.null())),
        // Common fields
        location: v.optional(v.union(v.string(), v.null())),
        address: v.optional(v.union(v.string(), v.null())),
        website: v.optional(v.union(v.string(), v.null())),
        phoneNumber: v.optional(v.union(v.string(), v.null())),
        priceRange: v.optional(v.union(v.string(), v.null())),
        ageRange: v.optional(v.union(v.string(), v.null())),
        sourceName: v.optional(v.union(v.string(), v.null())),
        sourceUrl: v.optional(v.union(v.string(), v.null())),
        sourceLocation: v.optional(v.union(v.string(), v.null())),
        matchScore: v.optional(v.union(v.number(), v.null())),
        aiSummary: v.optional(v.union(v.string(), v.null())),
        targetMembers: v.optional(v.union(v.array(v.string()), v.null())),
        scrapedAt: v.optional(v.union(v.string(), v.null())),
        sourceCategories: v.optional(v.union(v.array(v.string()), v.null())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const savedActivities: string[] = [];

    for (const activity of args.activities) {
      // Check if this activity already exists (deduplicate by title + location)
      const existing = await ctx.db
        .query("suggestedActivities")
        .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
        .filter((q) => q.eq(q.field("title"), activity.title))
        .first();

      if (existing) {
        // Update existing activity with new info (convert null to undefined)
        await ctx.db.patch(existing._id, {
          description: nullToUndefined(activity.description),
          website: nullToUndefined(activity.website),
          phoneNumber: nullToUndefined(activity.phoneNumber),
          priceRange: nullToUndefined(activity.priceRange),
          aiSummary: nullToUndefined(activity.aiSummary),
        });
        savedActivities.push(existing._id);
      } else {
        // Create new suggested activity (convert null to undefined for schema)
        const activityId = await ctx.db.insert("suggestedActivities", {
          familyId: args.familyId,
          title: activity.title,
          description: nullToUndefined(activity.description),
          category: activity.category,
          type: nullToUndefined(activity.type),
          ageRange: nullToUndefined(activity.ageRange),
          location: nullToUndefined(activity.location),
          address: nullToUndefined(activity.address),
          website: nullToUndefined(activity.website),
          phoneNumber: nullToUndefined(activity.phoneNumber),
          priceRange: nullToUndefined(activity.priceRange),
          sourceUrl: nullToUndefined(activity.sourceUrl),
          aiSummary: nullToUndefined(activity.aiSummary),
          status: "suggested",
          suggestedAt: Date.now(),
          // Event fields
          date: nullToUndefined(activity.date),
          time: nullToUndefined(activity.time),
          endTime: nullToUndefined(activity.endTime),
          recurring: nullToUndefined(activity.recurring),
          registrationRequired: nullToUndefined(activity.registrationRequired),
          registrationDeadline: nullToUndefined(activity.registrationDeadline),
          // Place fields
          hoursOfOperation: nullToUndefined(activity.hoursOfOperation),
          admission: nullToUndefined(activity.admission),
          amenities: nullToUndefined(activity.amenities),
          // Metadata
          sourceName: nullToUndefined(activity.sourceName),
          sourceLocation: nullToUndefined(activity.sourceLocation),
          scrapedAt: nullToUndefined(activity.scrapedAt),
          sourceCategories: nullToUndefined(activity.sourceCategories),
          targetMembers: nullToUndefined(activity.targetMembers),
          matchScore: nullToUndefined(activity.matchScore),
          distance: undefined, // TODO: Calculate distance from family location
          rating: undefined, // Could integrate Google Places API for ratings
          imageUrl: undefined, // Could fetch from website or use placeholder
        });
        savedActivities.push(activityId);
      }
    }

    return {
      success: true,
      activitiesSaved: savedActivities.length,
      activityIds: savedActivities,
    };
  },
});

/**
 * Public action to scrape events and generate recommendations for a family
 * This orchestrates the whole discovery process
 * Called from the Discover page UI
 */
export const discoverActivitiesForFamily = action({
  args: {
    familyId: v.id("families"),
    userLocation: v.optional(v.string()),
    distance: v.optional(v.number()), // Search radius in miles
    startDate: v.optional(v.string()), // Date range filter (YYYY-MM-DD)
    endDate: v.optional(v.string()), // Date range filter (YYYY-MM-DD)
    apiBaseUrl: v.optional(v.string()), // Pass from client (window.location.origin)
  },
  handler: async (ctx, args) => {
    return await discoverActivitiesForFamilyHandler(ctx, args);
  },
});

/**
 * Manually trigger discovery for testing
 */
export const manualDiscovery = mutation({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    // This just marks that a manual discovery was requested
    // The actual work is done by the action
    return {
      familyId: args.familyId,
      triggeredAt: Date.now(),
    };
  },
});

/**
 * Internal cron action - runs discovery for all active families
 * Called daily by the cron job
 */
export const runDailyDiscovery = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all families with active subscriptions
    const families = await ctx.runQuery(internal.families.getAllActiveFamilies);

    let successCount = 0;
    let errorCount = 0;

    for (const family of families) {
      try {
        await ctx.runAction(internal.discover.discoverActivitiesForFamilyInternal, {
          familyId: family._id,
        });
        successCount++;
      } catch (error) {
        console.error(`Error discovering activities for family ${family._id}:`, error);
        errorCount++;
      }

      // Rate limiting between families
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`Daily discovery completed: ${successCount} succeeded, ${errorCount} failed`);
    return {
      totalFamilies: families.length,
      successCount,
      errorCount,
    };
  },
});

/**
 * Internal version for cron jobs
 */
export const discoverActivitiesForFamilyInternal = internalAction({
  args: {
    familyId: v.id("families"),
    userLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await discoverActivitiesForFamilyHandler(ctx, args);
  },
});

// Shared handler logic
async function discoverActivitiesForFamilyHandler(ctx: any, args: { familyId: any; userLocation?: string; distance?: number; startDate?: string; endDate?: string; apiBaseUrl?: string }) {
  // Determine API base URL (use passed value or construct from env for cron)
  const baseUrl = args.apiBaseUrl || process.env.SITE_URL || "http://localhost:3000";

  // Step 1: Get family details for location
  const family = await ctx.runQuery(api.families.getFamilyById, {
    familyId: args.familyId,
  });

  // Get location from user-provided location or fallback to family data
  const location = args.userLocation || family?.location;

  if (!location) {
    throw new Error("Please enter your location to discover local activities");
  }

  // Get distance (default to 15 miles if not provided)
  const distance = args.distance || 15;

  // Get date range (defaults for 30 days from now if not provided)
  const startDate = args.startDate || new Date().toISOString().split('T')[0];
  const endDate = args.endDate || (() => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    return futureDate.toISOString().split('T')[0];
  })();

  // Step 2: Get family members for personalization
  const familyMembers = await ctx.runQuery(api.familyMembers.getFamilyMembers, {
    familyId: args.familyId,
  });

  // Step 3: Call the scraping API with location, distance, and date range
  let scrapeResponse;
  try {
    scrapeResponse = await fetch(`${baseUrl}/api/discover/scrape-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, distance, startDate, endDate }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      throw new Error(`Scraping API returned ${scrapeResponse.status}: ${errorText}`);
    }
  } catch (error: any) {
    console.error("Error calling scrape API:", error);
    throw new Error(`Discovery feature is currently unavailable. The scraping service cannot be reached from Convex actions. This feature requires deployment to a public URL to work properly. Error: ${error.message}`);
  }

  const scrapeData = await scrapeResponse.json();
  const events = scrapeData.events || [];

  if (events.length === 0) {
    return {
      success: true,
      message: "No new events found",
      activitiesDiscovered: 0,
      eventsScraped: 0,
    };
  }

  // Step 4: Generate AI recommendations based on family profile
  const recommendResponse = await fetch(
    `${baseUrl}/api/discover/generate-recommendations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: args.familyId,
        events,
        familyMembers,
        userLocation: location,
      }),
    }
  );

  if (!recommendResponse.ok) {
    throw new Error("Failed to generate recommendations");
  }

  const recommendData = await recommendResponse.json();
  const recommendations = recommendData.recommendations || [];

  // Step 4: Save recommended activities to Convex
  if (recommendations.length > 0) {
    await ctx.runMutation(api.discover.saveDiscoveredActivities, {
      familyId: args.familyId,
      activities: recommendations,
    });
  }

  return {
    success: true,
    eventsScraped: events.length,
    activitiesDiscovered: recommendations.length,
    message: `Found ${recommendations.length} personalized recommendations`,
  };
}
