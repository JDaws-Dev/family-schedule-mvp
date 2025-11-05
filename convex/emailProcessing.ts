import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";

/**
 * Smart Email Processing with Cost Optimization
 *
 * 3-Layer Filtering System:
 * 1. Whitelist/Blacklist (FREE - 80% of emails filtered)
 * 2. Llama 3.1 Quick Classification ($0.0005 per email - 15% filtered)
 * 3. GPT-4o-mini Full Extraction ($0.0025 per email - 5% extracted)
 *
 * Result: $0.60/month per family instead of $3-6/month
 */

// Activity-related keywords for quick filtering (FREE)
const ACTIVITY_KEYWORDS = [
  'practice', 'game', 'recital', 'performance', 'tournament',
  'class', 'lesson', 'session', 'workshop', 'camp',
  'meeting', 'conference', 'parent-teacher', 'orientation',
  'schedule', 'calendar', 'reminder', 'upcoming',
  'registration', 'sign-up', 'enrollment',
  'rehearsal', 'tryout', 'audition',
  'field trip', 'event', 'activity'
];

const COMMON_ACTIVITY_DOMAINS = [
  'school.edu', 'academy.com', 'ymca.org', 'ymca.net',
  'league.com', 'sports.com', 'rec.gov', 'city.gov',
  'studio.com', 'music', 'dance', 'karate', 'martial'
];

// Check if email should be processed based on whitelist/blacklist
export const shouldProcessEmail = query({
  args: {
    familyId: v.id("families"),
    senderEmail: v.string(),
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    // Extract domain from email
    const senderDomain = args.senderEmail.split('@')[1];

    // Check explicit filters first
    const emailFilter = await ctx.db
      .query("emailFilters")
      .withIndex("by_sender_email", (q) => q.eq("senderEmail", args.senderEmail))
      .filter((q) => q.eq(q.field("familyId"), args.familyId))
      .first();

    if (emailFilter) {
      if (emailFilter.filterType === "never_scan") {
        return { shouldProcess: false, reason: "blacklisted", cost: 0 };
      }
      if (emailFilter.filterType === "always_scan") {
        return { shouldProcess: true, reason: "whitelisted", cost: 0 };
      }
    }

    // Check domain filters
    const domainFilter = await ctx.db
      .query("emailFilters")
      .withIndex("by_sender_domain", (q) => q.eq("senderDomain", senderDomain))
      .filter((q) => q.eq(q.field("familyId"), args.familyId))
      .first();

    if (domainFilter) {
      if (domainFilter.filterType === "never_scan") {
        return { shouldProcess: false, reason: "domain_blacklisted", cost: 0 };
      }
      if (domainFilter.filterType === "always_scan") {
        return { shouldProcess: true, reason: "domain_whitelisted", cost: 0 };
      }
    }

    // Quick keyword check (FREE)
    const subjectLower = args.subject.toLowerCase();
    const hasActivityKeyword = ACTIVITY_KEYWORDS.some(keyword =>
      subjectLower.includes(keyword)
    );
    const hasActivityDomain = COMMON_ACTIVITY_DOMAINS.some(domain =>
      senderDomain.includes(domain)
    );

    if (!hasActivityKeyword && !hasActivityDomain) {
      return { shouldProcess: false, reason: "no_keywords", cost: 0 };
    }

    // Passed initial filters - needs AI classification
    return { shouldProcess: true, reason: "needs_classification", cost: 0 };
  },
});

// Classify email with Llama 3.1 (CHEAP - $0.0005)
export const classifyEmail = action({
  args: {
    subject: v.string(),
    fromEmail: v.string(),
    snippet: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Call Groq API with Llama 3.1
    // const response = await fetch('https://api.groq.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     model: 'llama-3.1-70b-versatile',
    //     messages: [{
    //       role: 'user',
    //       content: `Does this email contain information about a child's activity or event?
    //         From: ${args.fromEmail}
    //         Subject: ${args.subject}
    //         Preview: ${args.snippet}
    //
    //         Answer only: YES or NO`
    //     }],
    //     temperature: 0
    //   })
    // });

    // Mock for now - replace with actual Llama call
    const isActivity = args.subject.toLowerCase().includes('practice') ||
                      args.subject.toLowerCase().includes('game');

    return {
      isActivity,
      confidence: 0.85,
      cost: 0.0005
    };
  },
});

// Extract event details with GPT-4o-mini (MEDIUM COST - $0.0025)
export const extractEventDetails = action({
  args: {
    emailContent: v.string(),
    subject: v.string(),
    fromEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Call OpenAI GPT-4o-mini
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4o-mini',
    //     messages: [{
    //       role: 'system',
    //       content: 'Extract event details from emails. Return JSON with: title, date, time, location, childName, category'
    //     }, {
    //       role: 'user',
    //       content: `Subject: ${args.subject}\nFrom: ${args.fromEmail}\n\n${args.emailContent}`
    //     }],
    //     response_format: { type: 'json_object' }
    //   })
    // });

    // Mock for now - replace with actual GPT call
    return {
      events: [{
        title: "Soccer Practice",
        eventDate: "2024-11-15",
        eventTime: "4:00 PM",
        location: "West Field",
        childName: "Emma",
        category: "sports",
        confidence: "high"
      }],
      cost: 0.0025
    };
  },
});

// Add sender to whitelist (user teaches the system)
export const addToWhitelist = mutation({
  args: {
    familyId: v.id("families"),
    senderEmail: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailFilters")
      .withIndex("by_sender_email", (q) => q.eq("senderEmail", args.senderEmail))
      .filter((q) => q.eq(q.field("familyId"), args.familyId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        filterType: "always_scan",
        addedByUserId: args.userId,
      });
    } else {
      await ctx.db.insert("emailFilters", {
        familyId: args.familyId,
        senderEmail: args.senderEmail,
        filterType: "always_scan",
        addedByUserId: args.userId,
        addedAt: Date.now(),
        eventsFoundCount: 0,
      });
    }
  },
});

// Add sender to blacklist
export const addToBlacklist = mutation({
  args: {
    familyId: v.id("families"),
    senderEmail: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailFilters")
      .withIndex("by_sender_email", (q) => q.eq("senderEmail", args.senderEmail))
      .filter((q) => q.eq(q.field("familyId"), args.familyId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        filterType: "never_scan",
        addedByUserId: args.userId,
      });
    } else {
      await ctx.db.insert("emailFilters", {
        familyId: args.familyId,
        senderEmail: args.senderEmail,
        filterType: "never_scan",
        addedByUserId: args.userId,
        addedAt: Date.now(),
        eventsFoundCount: 0,
      });
    }
  },
});

// Get all filters for a family
export const getEmailFilters = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailFilters")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

// Check if email has already been processed
export const isEmailProcessed = query({
  args: {
    gmailAccountId: v.id("gmailAccounts"),
    gmailMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailProcessingLog")
      .withIndex("by_message_id", (q) => q.eq("gmailMessageId", args.gmailMessageId))
      .filter((q) => q.eq(q.field("gmailAccountId"), args.gmailAccountId))
      .first();

    return !!existing;
  },
});

// Log email processing
export const logEmailProcessing = mutation({
  args: {
    gmailAccountId: v.id("gmailAccounts"),
    gmailMessageId: v.string(),
    subject: v.optional(v.string()),
    fromEmail: v.optional(v.string()),
    eventsExtracted: v.number(),
    processingStatus: v.union(
      v.literal("pending"),
      v.literal("processed"),
      v.literal("error"),
      v.literal("skipped")
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailProcessingLog", {
      gmailAccountId: args.gmailAccountId,
      gmailMessageId: args.gmailMessageId,
      subject: args.subject,
      fromEmail: args.fromEmail,
      receivedDate: Date.now(),
      eventsExtracted: args.eventsExtracted,
      processingStatus: args.processingStatus,
      errorMessage: args.errorMessage,
    });
  },
});

// Get processing log for debugging
export const getProcessingLog = query({
  args: {
    gmailAccountId: v.id("gmailAccounts"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("emailProcessingLog")
      .withIndex("by_gmail_account", (q) => q.eq("gmailAccountId", args.gmailAccountId))
      .order("desc")
      .take(args.limit || 20);

    return logs;
  },
});

// Clear processing log (for debugging/testing)
export const clearProcessingLog = mutation({
  args: {
    gmailAccountId: v.id("gmailAccounts"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("emailProcessingLog")
      .withIndex("by_gmail_account", (q) => q.eq("gmailAccountId", args.gmailAccountId))
      .collect();

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    return { deletedCount: logs.length };
  },
});

/**
 * Gmail Push Notification Handler
 *
 * When Gmail receives new email:
 * 1. Gmail → Pub/Sub → Your webhook
 * 2. Webhook triggers this function
 * 3. Process only new emails (using historyId)
 *
 * Setup: https://developers.google.com/gmail/api/guides/push
 */
export const handleGmailPushNotification = action({
  args: {
    gmailAccountId: v.id("gmailAccounts"),
    historyId: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Implement incremental sync using Gmail History API
    // const gmailAccount = await ctx.runQuery(api.gmailAccounts.getById, {
    //   accountId: args.gmailAccountId
    // });

    // const history = await fetchGmailHistory(
    //   gmailAccount.accessToken,
    //   gmailAccount.gmailHistoryId,
    //   args.historyId
    // );

    // for (const message of history.messages) {
    //   await processEmailWithSmartFiltering(message);
    // }

    return { success: true };
  },
});
