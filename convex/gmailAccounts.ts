import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Connect a new Gmail account to the family
export const connectGmailAccount = mutation({
  args: {
    clerkId: v.string(),
    gmailEmail: v.string(),
    displayName: v.optional(v.string()),
    accessToken: v.string(),
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("connectGmailAccount mutation called with clerkId:", args.clerkId);

    // Get user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      console.error("User not found for clerkId:", args.clerkId);
      throw new Error(`User not found for clerkId: ${args.clerkId}`);
    }

    console.log("Found user:", { userId: user._id, familyId: user.familyId });

    // Check if this Gmail account is already connected
    const existing = await ctx.db
      .query("gmailAccounts")
      .withIndex("by_gmail_email", (q) => q.eq("gmailEmail", args.gmailEmail))
      .first();

    if (existing) {
      console.log("Updating existing account:", existing._id);
      console.log("Old familyId:", existing.familyId, "New familyId:", user.familyId);
      // Update existing account (including familyId in case user switched families)
      await ctx.db.patch(existing._id, {
        familyId: user.familyId, // Update to current user's family
        connectedByUserId: user._id, // Update who connected it
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        connectedAt: Date.now(),
        isActive: true,
        displayName: args.displayName,
      });

      return {
        accountId: existing._id,
        isNew: false,
      };
    }

    console.log("Creating new Gmail account connection");
    // Create new Gmail account connection
    const accountId = await ctx.db.insert("gmailAccounts", {
      familyId: user.familyId,
      connectedByUserId: user._id,
      gmailEmail: args.gmailEmail,
      displayName: args.displayName,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      connectedAt: Date.now(),
      isActive: true,
    });

    console.log("Successfully created Gmail account:", accountId);
    return {
      accountId,
      isNew: true,
    };
  },
});

// Get all Gmail accounts for a family
export const getFamilyGmailAccounts = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("gmailAccounts")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    // Get user info for each account
    const accountsWithUsers = await Promise.all(
      accounts.map(async (account) => {
        const connectedBy = await ctx.db.get(account.connectedByUserId);
        return {
          ...account,
          connectedByName: connectedBy?.fullName || connectedBy?.email,
        };
      })
    );

    return accountsWithUsers;
  },
});

// Update Gmail account tokens (for token refresh)
export const updateGmailTokens = mutation({
  args: {
    accountId: v.id("gmailAccounts"),
    accessToken: v.string(),
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
    });
  },
});

// Update last sync time
export const updateLastSync = mutation({
  args: {
    accountId: v.id("gmailAccounts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, {
      lastSyncAt: Date.now(),
    });
  },
});

// Toggle Gmail account active status
export const toggleGmailAccountStatus = mutation({
  args: {
    accountId: v.id("gmailAccounts"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, {
      isActive: args.isActive,
    });
  },
});

// Update display name
export const updateDisplayName = mutation({
  args: {
    accountId: v.id("gmailAccounts"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, {
      displayName: args.displayName,
    });
  },
});

// Remove Gmail account
export const removeGmailAccount = mutation({
  args: {
    accountId: v.id("gmailAccounts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.accountId);
  },
});

// Get active Gmail accounts for scanning
export const getActiveGmailAccounts = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("gmailAccounts")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    return accounts.filter((account) => account.isActive);
  },
});

// Get Gmail account by ID
export const getGmailAccountById = query({
  args: {
    accountId: v.id("gmailAccounts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.accountId);
  },
});

// Get Gmail account by email address (for push notifications)
export const getByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gmailAccounts")
      .withIndex("by_gmail_email", (q) => q.eq("gmailEmail", args.email))
      .first();
  },
});

// Update Gmail push notification status
export const updatePushStatus = mutation({
  args: {
    accountId: v.id("gmailAccounts"),
    enabled: v.boolean(),
    channelId: v.optional(v.string()),
    historyId: v.optional(v.string()),
    expiration: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      gmailPushEnabled: args.enabled,
      gmailPushLastSetup: Date.now(),
    };

    if (args.channelId) {
      updateData.gmailPushChannelId = args.channelId;
    }

    if (args.historyId) {
      updateData.gmailHistoryId = args.historyId;
    }

    if (args.expiration) {
      updateData.gmailPushExpiration = args.expiration;
    }

    if (args.error) {
      updateData.gmailPushError = args.error;
    } else {
      // Clear error on success
      updateData.gmailPushError = undefined;
    }

    await ctx.db.patch(args.accountId, updateData);
  },
});
