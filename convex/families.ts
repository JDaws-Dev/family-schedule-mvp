import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

// Create a new family (called when primary user signs up)
export const createFamily = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const familyId = await ctx.db.insert("families", {
      name: args.name,
      subscriptionStatus: "trialing",
      subscriptionTier: "standard",
      trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      createdAt: Date.now(),
    });

    return familyId;
  },
});

// Get family details by ID
export const getFamilyById = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.familyId);
  },
});

// Alias for getFamilyById (used by sync endpoints)
export const getFamily = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.familyId);
  },
});

// Get all users in a family
export const getFamilyMembers = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("users")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    return members;
  },
});

// Update family details (name, email, etc.)
export const updateFamilyDetails = mutation({
  args: {
    familyId: v.id("families"),
    name: v.optional(v.string()),
    primaryEmail: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    enableSmsNotifications: v.optional(v.boolean()),
    emailDigestFrequency: v.optional(v.union(v.literal("none"), v.literal("daily"), v.literal("weekly"))),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { familyId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: any = {};
    if (updates.name !== undefined) filteredUpdates.name = updates.name;
    if (updates.primaryEmail !== undefined) filteredUpdates.primaryEmail = updates.primaryEmail;
    if (updates.phoneNumber !== undefined) filteredUpdates.phoneNumber = updates.phoneNumber;
    if (updates.enableSmsNotifications !== undefined) filteredUpdates.enableSmsNotifications = updates.enableSmsNotifications;
    if (updates.emailDigestFrequency !== undefined) filteredUpdates.emailDigestFrequency = updates.emailDigestFrequency;
    if (updates.location !== undefined) filteredUpdates.location = updates.location;

    await ctx.db.patch(familyId, filteredUpdates);

    return { success: true };
  },
});

// Update family subscription details (for Stripe integration)
export const updateFamilySubscription = mutation({
  args: {
    familyId: v.id("families"),
    stripeCustomerId: v.optional(v.string()),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("canceled"),
        v.literal("past_due"),
        v.literal("trialing")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { familyId, ...updates } = args;

    await ctx.db.patch(familyId, updates);

    return { success: true };
  },
});

// Send invitation to spouse
export const createInvitation = mutation({
  args: {
    familyId: v.id("families"),
    invitedByUserId: v.id("users"),
    inviteeEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate a random invitation code
    const invitationCode = Math.random().toString(36).substring(2, 15);

    // Check if invitation already exists for this email and family
    const existingInvite = await ctx.db
      .query("familyInvitations")
      .withIndex("by_email", (q) => q.eq("inviteeEmail", args.inviteeEmail))
      .filter((q) => q.eq(q.field("familyId"), args.familyId))
      .first();

    if (existingInvite && existingInvite.status === "pending") {
      // Return existing invitation if still pending
      return {
        invitationCode: existingInvite.invitationCode,
        alreadyExists: true,
      };
    }

    // Create new invitation
    const invitationId = await ctx.db.insert("familyInvitations", {
      familyId: args.familyId,
      invitedByUserId: args.invitedByUserId,
      inviteeEmail: args.inviteeEmail,
      invitationCode,
      status: "pending",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
    });

    // TODO: Send email with invitation link using Resend
    // await sendInvitationEmail(args.inviteeEmail, invitationCode);

    return {
      invitationId,
      invitationCode,
      alreadyExists: false,
    };
  },
});

// Get invitation by code (used during spouse signup)
export const getInvitationByCode = query({
  args: {
    invitationCode: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("familyInvitations")
      .withIndex("by_code", (q) => q.eq("invitationCode", args.invitationCode))
      .first();

    if (!invitation) {
      return null;
    }

    // Check if expired
    if (invitation.expiresAt < Date.now()) {
      // Mark as expired
      await (ctx.db as any).patch(invitation._id, { status: "expired" });
      return null;
    }

    if (invitation.status !== "pending") {
      return null;
    }

    return invitation;
  },
});

// Accept invitation (called when spouse signs up with code)
export const acceptInvitation = mutation({
  args: {
    invitationCode: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("familyInvitations")
      .withIndex("by_code", (q) => q.eq("invitationCode", args.invitationCode))
      .first();

    if (!invitation || invitation.status !== "pending") {
      throw new Error("Invalid or expired invitation");
    }

    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    // Update invitation status
    await ctx.db.patch(invitation._id, { status: "accepted" });

    // Update user's family
    await ctx.db.patch(args.userId, {
      familyId: invitation.familyId,
    });

    return {
      success: true,
      familyId: invitation.familyId,
    };
  },
});

// Get pending invitations for a family
export const getFamilyInvitations = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("familyInvitations")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return invitations;
  },
});

// Get all families (for cron job)
export const getAllFamilies = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("families").collect();
  },
});

// Internal version for cron jobs
export const getAllFamiliesInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("families").collect();
  },
});

// Get all active families (for discovery cron job)
export const getAllActiveFamilies = internalQuery({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();

    // Filter for active or trialing subscriptions
    return families.filter(
      (f) => f.subscriptionStatus === "active" || f.subscriptionStatus === "trialing"
    );
  },
});

// Update family location for activity discovery
export const updateFamilyLocation = mutation({
  args: {
    familyId: v.id("families"),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.familyId, {
      location: args.location,
    });

    return { success: true };
  },
});

// Update last calendar sync timestamp
export const updateLastCalendarSync = mutation({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.familyId, {
      lastCalendarSyncAt: Date.now(),
    });

    return { success: true };
  },
});

// Update selected Google Calendar
export const updateSelectedCalendar = mutation({
  args: {
    familyId: v.id("families"),
    googleCalendarId: v.string(),
    calendarName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.familyId, {
      googleCalendarId: args.googleCalendarId,
      calendarName: args.calendarName,
    });

    return { success: true };
  },
});

// Add custom category to family
export const addCustomCategory = mutation({
  args: {
    familyId: v.id("families"),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const family = await ctx.db.get(args.familyId);
    if (!family) {
      throw new Error("Family not found");
    }

    const existingCategories = family.customCategories || [];

    // Check if category already exists (case-insensitive)
    const categoryExists = existingCategories.some(
      (c) => c.toLowerCase() === args.category.toLowerCase()
    );

    if (categoryExists) {
      return { success: true, message: "Category already exists" };
    }

    // Add new category
    await ctx.db.patch(args.familyId, {
      customCategories: [...existingCategories, args.category],
    });

    return { success: true, message: "Category added" };
  },
});

// Get all categories (default + custom) for a family
export const getAllCategories = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    const family = await ctx.db.get(args.familyId);
    if (!family) {
      return {
        defaultCategories: ["Sports", "Lessons", "School", "Appointments", "Other"],
        customCategories: [],
      };
    }

    return {
      defaultCategories: ["Sports", "Lessons", "School", "Appointments", "Other"],
      customCategories: family.customCategories || [],
    };
  },
});

// Update calendar webhook info (for push notifications)
export const updateCalendarWebhook = mutation({
  args: {
    familyId: v.id("families"),
    calendarWebhookChannelId: v.string(),
    calendarWebhookResourceId: v.string(),
    calendarWebhookExpiration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.familyId, {
      calendarWebhookChannelId: args.calendarWebhookChannelId,
      calendarWebhookResourceId: args.calendarWebhookResourceId,
      calendarWebhookExpiration: args.calendarWebhookExpiration,
    });

    return { success: true };
  },
});

// Clear all data from database (for testing/reset)
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting database clear...");

    let total = 0;

    // Delete suggestedActivities
    const suggestedActivities = await ctx.db.query("suggestedActivities").collect();
    for (const doc of suggestedActivities) {
      await ctx.db.delete(doc._id);
    }
    total += suggestedActivities.length;

    // Delete familyInvitations
    const familyInvitations = await ctx.db.query("familyInvitations").collect();
    for (const doc of familyInvitations) {
      await ctx.db.delete(doc._id);
    }
    total += familyInvitations.length;

    // Delete familyMembers
    const familyMembers = await ctx.db.query("familyMembers").collect();
    for (const doc of familyMembers) {
      await ctx.db.delete(doc._id);
    }
    total += familyMembers.length;

    // Delete userPreferences
    const userPreferences = await ctx.db.query("userPreferences").collect();
    for (const doc of userPreferences) {
      await ctx.db.delete(doc._id);
    }
    total += userPreferences.length;

    // Delete remindersSent
    const remindersSent = await ctx.db.query("remindersSent").collect();
    for (const doc of remindersSent) {
      await ctx.db.delete(doc._id);
    }
    total += remindersSent.length;

    // Delete emailProcessingLog
    const emailProcessingLog = await ctx.db.query("emailProcessingLog").collect();
    for (const doc of emailProcessingLog) {
      await ctx.db.delete(doc._id);
    }
    total += emailProcessingLog.length;

    // Delete events
    const events = await ctx.db.query("events").collect();
    for (const doc of events) {
      await ctx.db.delete(doc._id);
    }
    total += events.length;

    // Delete emailFilters
    const emailFilters = await ctx.db.query("emailFilters").collect();
    for (const doc of emailFilters) {
      await ctx.db.delete(doc._id);
    }
    total += emailFilters.length;

    // Delete gmailAccounts
    const gmailAccounts = await ctx.db.query("gmailAccounts").collect();
    for (const doc of gmailAccounts) {
      await ctx.db.delete(doc._id);
    }
    total += gmailAccounts.length;

    // Delete users
    const users = await ctx.db.query("users").collect();
    for (const doc of users) {
      await ctx.db.delete(doc._id);
    }
    total += users.length;

    // Delete families
    const families = await ctx.db.query("families").collect();
    for (const doc of families) {
      await ctx.db.delete(doc._id);
    }
    total += families.length;

    console.log(`Database clear complete! Total documents deleted: ${total}`);

    return {
      success: true,
      totalDeleted: total,
    };
  },
});
