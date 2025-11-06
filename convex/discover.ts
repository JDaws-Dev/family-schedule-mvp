import { v } from "convex/values";
import { mutation, query, action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

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
        date: v.optional(v.union(v.string(), v.null())),
        time: v.optional(v.union(v.string(), v.null())),
        endTime: v.optional(v.union(v.string(), v.null())),
        location: v.optional(v.union(v.string(), v.null())),
        address: v.optional(v.union(v.string(), v.null())),
        website: v.optional(v.union(v.string(), v.null())),
        phoneNumber: v.optional(v.union(v.string(), v.null())),
        priceRange: v.optional(v.union(v.string(), v.null())),
        ageRange: v.optional(v.union(v.string(), v.null())),
        recurring: v.optional(v.union(v.boolean(), v.null())),
        registrationRequired: v.optional(v.union(v.boolean(), v.null())),
        registrationDeadline: v.optional(v.union(v.string(), v.null())),
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
        // Update existing activity with new info
        await ctx.db.patch(existing._id, {
          description: activity.description,
          website: activity.website,
          phoneNumber: activity.phoneNumber,
          priceRange: activity.priceRange,
          aiSummary: activity.aiSummary,
        });
        savedActivities.push(existing._id);
      } else {
        // Create new suggested activity
        const activityId = await ctx.db.insert("suggestedActivities", {
          familyId: args.familyId,
          title: activity.title,
          description: activity.description,
          category: activity.category,
          ageRange: activity.ageRange,
          location: activity.location,
          address: activity.address,
          website: activity.website,
          phoneNumber: activity.phoneNumber,
          priceRange: activity.priceRange,
          sourceUrl: activity.sourceUrl,
          aiSummary: activity.aiSummary,
          status: "suggested",
          suggestedAt: Date.now(),
          // Save event date/time information
          date: activity.date,
          time: activity.time,
          endTime: activity.endTime,
          recurring: activity.recurring,
          registrationRequired: activity.registrationRequired,
          registrationDeadline: activity.registrationDeadline,
          sourceName: activity.sourceName,
          sourceLocation: activity.sourceLocation,
          // Save new fields from scraping/recommendations
          scrapedAt: activity.scrapedAt,
          sourceCategories: activity.sourceCategories,
          targetMembers: activity.targetMembers,
          matchScore: activity.matchScore,
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
async function discoverActivitiesForFamilyHandler(ctx: any, args: { familyId: any; userLocation?: string; distance?: number; apiBaseUrl?: string }) {
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

  // Step 2: Get family members for personalization
  const familyMembers = await ctx.runQuery(api.familyMembers.getFamilyMembers, {
    familyId: args.familyId,
  });

  // Step 3: Call the scraping API with location and distance
  let scrapeResponse;
  try {
    scrapeResponse = await fetch(`${baseUrl}/api/discover/scrape-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, distance }),
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
