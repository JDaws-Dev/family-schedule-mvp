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
        description: v.optional(v.string()),
        category: v.string(),
        date: v.optional(v.string()),
        time: v.optional(v.string()),
        endTime: v.optional(v.string()),
        location: v.optional(v.string()),
        address: v.optional(v.string()),
        website: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
        priceRange: v.optional(v.string()),
        ageRange: v.optional(v.string()),
        recurring: v.optional(v.boolean()),
        registrationRequired: v.optional(v.boolean()),
        registrationDeadline: v.optional(v.string()),
        sourceName: v.optional(v.string()),
        sourceUrl: v.optional(v.string()),
        matchScore: v.optional(v.number()),
        aiSummary: v.optional(v.string()),
        targetMembers: v.optional(v.array(v.string())),
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
async function discoverActivitiesForFamilyHandler(ctx: any, args: { familyId: any; userLocation?: string; apiBaseUrl?: string }) {
  // Determine API base URL (use passed value or construct from env for cron)
  const baseUrl = args.apiBaseUrl || process.env.SITE_URL || "http://localhost:3000";

  // Step 1: Get family details for location
  const family = await ctx.runQuery(api.families.getFamilyById, {
    familyId: args.familyId,
  });

  // Get location from family data or fallback to user-provided location
  const location = family?.location || args.userLocation;

  if (!location) {
    throw new Error("Please set your location in Settings to discover local activities");
  }

  // Step 2: Get family members for personalization
  const familyMembers = await ctx.runQuery(api.familyMembers.getFamilyMembers, {
    familyId: args.familyId,
  });

  // Step 3: Call the scraping API with location
  let scrapeResponse;
  try {
    scrapeResponse = await fetch(`${baseUrl}/api/discover/scrape-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location }),
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
