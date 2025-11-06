import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all family members for a family
export const getFamilyMembers = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("familyMembers")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

// Add a new family member
export const addFamilyMember = mutation({
  args: {
    familyId: v.id("families"),
    name: v.string(),
    birthdate: v.optional(v.string()),
    relationship: v.optional(v.string()),
    nicknames: v.string(), // Comma-separated
    interests: v.string(), // Comma-separated
    color: v.optional(v.string()), // Hex color code
  },
  handler: async (ctx, args) => {
    const nicknamesArray = args.nicknames
      ? args.nicknames.split(",").map((n) => n.trim()).filter((n) => n.length > 0)
      : [];
    const interestsArray = args.interests
      ? args.interests.split(",").map((i) => i.trim()).filter((i) => i.length > 0)
      : [];

    const memberId = await ctx.db.insert("familyMembers", {
      familyId: args.familyId,
      name: args.name,
      birthdate: args.birthdate,
      relationship: args.relationship,
      nicknames: nicknamesArray,
      interests: interestsArray,
      color: args.color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return memberId;
  },
});

// Update a family member
export const updateFamilyMember = mutation({
  args: {
    memberId: v.id("familyMembers"),
    name: v.string(),
    birthdate: v.optional(v.string()),
    relationship: v.optional(v.string()),
    nicknames: v.string(), // Comma-separated
    interests: v.string(), // Comma-separated
    color: v.optional(v.string()), // Hex color code
  },
  handler: async (ctx, args) => {
    const nicknamesArray = args.nicknames
      ? args.nicknames.split(",").map((n) => n.trim()).filter((n) => n.length > 0)
      : [];
    const interestsArray = args.interests
      ? args.interests.split(",").map((i) => i.trim()).filter((i) => i.length > 0)
      : [];

    await ctx.db.patch(args.memberId, {
      name: args.name,
      birthdate: args.birthdate,
      relationship: args.relationship,
      nicknames: nicknamesArray,
      interests: interestsArray,
      color: args.color,
      updatedAt: Date.now(),
    });
  },
});

// Delete a family member
export const deleteFamilyMember = mutation({
  args: {
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.memberId);
  },
});
