import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create user (for primary account - creates new family)
export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    invitationCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      return {
        userId: existing._id,
        familyId: existing.familyId,
        role: existing.role,
      };
    }

    let familyId;
    let role: "primary" | "spouse";

    // Check if signing up with invitation code
    if (args.invitationCode) {
      const invitation = await ctx.db
        .query("familyInvitations")
        .withIndex("by_code", (q) => q.eq("invitationCode", args.invitationCode!))
        .first();

      if (invitation && invitation.status === "pending" && invitation.expiresAt > Date.now()) {
        // Joining existing family as spouse
        familyId = invitation.familyId;
        role = "spouse";

        // Mark invitation as accepted
        await (ctx.db as any).patch(invitation._id, { status: "accepted" });
      } else {
        throw new Error("Invalid or expired invitation code");
      }
    } else {
      // Create new family for primary user
      familyId = await ctx.db.insert("families", {
        subscriptionStatus: "trialing",
        subscriptionTier: "standard",
        trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        createdAt: Date.now(),
      });
      role = "primary";
    }

    // Create user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      fullName: args.fullName,
      phoneNumber: args.phoneNumber,
      familyId,
      role,
    });

    // Create default preferences
    await ctx.db.insert("userPreferences", {
      userId,
      emailRemindersEnabled: true,
      smsRemindersEnabled: false,
      reminderHoursBefore: 24,
      weeklyDigestEnabled: true,
      weeklyDigestDay: "sunday",
      autoScanEmails: true,
      scanIntervalHours: 6,
    });

    return {
      userId,
      familyId,
      role,
    };
  },
});

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Update user's Gmail tokens
export const updateGmailTokens = mutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    await (ctx.db as any).patch(args.userId, {
      gmailAccessToken: args.accessToken,
      gmailRefreshToken: args.refreshToken,
      gmailConnectedAt: Date.now(),
    });
  },
});

// Get user with family info
export const getUserWithFamily = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const family = await ctx.db.get(user.familyId);

    return {
      ...user,
      family,
    };
  },
});

// Get user preferences
export const getPreferences = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Update user preferences
export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    emailRemindersEnabled: v.optional(v.boolean()),
    smsRemindersEnabled: v.optional(v.boolean()),
    reminderHoursBefore: v.optional(v.number()),
    weeklyDigestEnabled: v.optional(v.boolean()),
    weeklyDigestDay: v.optional(v.string()),
    autoScanEmails: v.optional(v.boolean()),
    scanIntervalHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (prefs) {
      await ctx.db.patch(prefs._id, updates);
    }
  },
});
