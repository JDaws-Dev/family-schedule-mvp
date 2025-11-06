import { v } from "convex/values";
import { query } from "./_generated/server";

// Get sync status for a family (Gmail and Calendar)
export const getSyncStatus = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    // Get family info for calendar sync
    const family = await ctx.db.get(args.familyId);

    // Get all Gmail accounts for this family
    const gmailAccounts = await ctx.db
      .query("gmailAccounts")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Find the most recent Gmail sync
    const mostRecentGmailSync = gmailAccounts.reduce((latest, account) => {
      if (!account.lastSyncAt) return latest;
      if (!latest || account.lastSyncAt > latest) return account.lastSyncAt;
      return latest;
    }, null as number | null);

    return {
      gmail: {
        lastSyncAt: mostRecentGmailSync,
        accountCount: gmailAccounts.length,
        accounts: gmailAccounts.map(acc => ({
          id: acc._id,
          email: acc.gmailEmail,
          displayName: acc.displayName,
          lastSyncAt: acc.lastSyncAt,
        })),
      },
      calendar: {
        lastSyncAt: family?.lastCalendarSyncAt ?? null,
        calendarId: family?.googleCalendarId ?? null,
        calendarName: family?.calendarName ?? null,
        isConnected: !!family?.googleCalendarId,
      },
    };
  },
});
