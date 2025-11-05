import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Get user preferences or create default ones
export const getUserPreferences = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    let prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // If no preferences exist, return defaults (don't create in query)
    if (!prefs) {
      return {
        userId: args.userId,
        emailRemindersEnabled: true,
        smsRemindersEnabled: false,
        reminderHoursBefore: 24, // 24 hours before
        weeklyDigestEnabled: false,
        weeklyDigestDay: "Sunday",
        autoScanEmails: true,
        scanIntervalHours: 24,
      };
    }

    return prefs;
  },
});

// Create or update user preferences
export const updateUserPreferences = mutation({
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

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      // Create new preferences with defaults
      return await ctx.db.insert("userPreferences", {
        userId,
        emailRemindersEnabled: updates.emailRemindersEnabled ?? true,
        smsRemindersEnabled: updates.smsRemindersEnabled ?? false,
        reminderHoursBefore: updates.reminderHoursBefore ?? 24,
        weeklyDigestEnabled: updates.weeklyDigestEnabled ?? false,
        weeklyDigestDay: updates.weeklyDigestDay ?? "Sunday",
        autoScanEmails: updates.autoScanEmails ?? true,
        scanIntervalHours: updates.scanIntervalHours ?? 24,
      });
    }
  },
});

// Log a sent reminder
export const logReminderSent = internalMutation({
  args: {
    userId: v.id("users"),
    eventId: v.optional(v.id("events")),
    reminderType: v.union(v.literal("email"), v.literal("sms"), v.literal("digest"), v.literal("rsvp_alert")),
    status: v.union(v.literal("sent"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("remindersSent", {
      userId: args.userId,
      eventId: args.eventId,
      reminderType: args.reminderType,
      status: args.status,
      sentAt: Date.now(),
      errorMessage: args.errorMessage,
    });
  },
});

// Check if reminder was already sent for an event
export const wasReminderSent = query({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
    reminderType: v.string(),
  },
  handler: async (ctx, args) => {
    const reminder = await ctx.db
      .query("remindersSent")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("reminderType"), args.reminderType),
          q.eq(q.field("status"), "sent")
        )
      )
      .first();

    return !!reminder;
  },
});

// Get all reminder history for a user
export const getUserReminderHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query("remindersSent")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 50);

    return reminders;
  },
});

// Get events that need reminders sent
export const getEventsNeedingReminders = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const todayStr = new Date(now).toISOString().split("T")[0];
    const futureStr = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Get all confirmed events in the next 7 days
    const events = await ctx.db
      .query("events")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isConfirmed"), true),
          q.gte(q.field("eventDate"), todayStr),
          q.lte(q.field("eventDate"), futureStr)
        )
      )
      .collect();

    return events;
  },
});

// Get events with approaching RSVP deadlines
export const getEventsWithApproachingRSVP = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const todayStr = new Date(now).toISOString().split("T")[0];
    const threeDaysFromNowStr = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Get confirmed events that require action with deadlines in the next 3 days
    const events = await ctx.db
      .query("events")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isConfirmed"), true),
          q.eq(q.field("requiresAction"), true),
          q.neq(q.field("actionDeadline"), undefined)
        )
      )
      .collect();

    // Filter for deadlines in the next 3 days
    return events.filter((event) => {
      if (!event.actionDeadline) return false;
      return event.actionDeadline >= todayStr && event.actionDeadline <= threeDaysFromNowStr;
    });
  },
});

// Internal action to send event reminders (called by cron)
export const sendEventReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all families
    const families = await ctx.runQuery(internal.notifications.getAllFamilies);

    for (const family of families) {
      // Get all users in this family
      const users = await ctx.runQuery(internal.notifications.getFamilyUsers, {
        familyId: family._id,
      });

      for (const user of users) {
        try {
          // Get user preferences
          const prefs = await ctx.runQuery(internal.notifications.getUserPreferences, {
            userId: user._id,
          });

          if (!prefs.emailRemindersEnabled) continue;

          // Get events that need reminders
          const events = await ctx.runQuery(internal.notifications.getEventsNeedingReminders, {
            familyId: family._id,
          });

          const now = Date.now();
          const reminderWindowMs = prefs.reminderHoursBefore * 60 * 60 * 1000;

          for (const event of events) {
            // Calculate event datetime
            const eventDate = new Date(event.eventDate);
            if (event.eventTime) {
              const [hours, minutes] = event.eventTime.split(":");
              eventDate.setHours(parseInt(hours), parseInt(minutes));
            }

            const eventMs = eventDate.getTime();
            const timeDiff = eventMs - now;

            // Check if we should send reminder (within reminder window, but not already sent)
            if (timeDiff > 0 && timeDiff <= reminderWindowMs) {
              const alreadySent = await ctx.runQuery(internal.notifications.wasReminderSent, {
                userId: user._id,
                eventId: event._id,
                reminderType: "email",
              });

              if (!alreadySent) {
                // Send reminder email
                try {
                  await ctx.runAction(internal.notifications.sendReminderEmail, {
                    userId: user._id,
                    eventId: event._id,
                    userEmail: user.email,
                    eventTitle: event.title,
                    eventDate: event.eventDate,
                    eventTime: event.eventTime,
                    eventLocation: event.location,
                    childName: event.childName,
                  });

                  // Log successful send
                  await ctx.runMutation(internal.notifications.logReminderSent, {
                    userId: user._id,
                    eventId: event._id,
                    reminderType: "email",
                    status: "sent",
                  });
                } catch (error: any) {
                  // Log failed send
                  await ctx.runMutation(internal.notifications.logReminderSent, {
                    userId: user._id,
                    eventId: event._id,
                    reminderType: "email",
                    status: "failed",
                    errorMessage: error.message,
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error processing reminders for user ${user._id}:`, error);
        }
      }
    }
  },
});

// Internal action to send RSVP alerts (called by cron)
export const sendRSVPAlerts = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all families
    const families = await ctx.runQuery(internal.notifications.getAllFamilies);

    for (const family of families) {
      // Get events with approaching RSVP deadlines
      const events = await ctx.runQuery(internal.notifications.getEventsWithApproachingRSVP, {
        familyId: family._id,
      });

      if (events.length === 0) continue;

      // Get all users in this family
      const users = await ctx.runQuery(internal.notifications.getFamilyUsers, {
        familyId: family._id,
      });

      for (const user of users) {
        try {
          // Get user preferences
          const prefs = await ctx.runQuery(internal.notifications.getUserPreferences, {
            userId: user._id,
          });

          if (!prefs.emailRemindersEnabled) continue;

          for (const event of events) {
            const alreadySent = await ctx.runQuery(internal.notifications.wasReminderSent, {
              userId: user._id,
              eventId: event._id,
              reminderType: "rsvp_alert",
            });

            if (!alreadySent) {
              // Send RSVP alert email
              try {
                await ctx.runAction(internal.notifications.sendRSVPAlertEmail, {
                  userId: user._id,
                  eventId: event._id,
                  userEmail: user.email,
                  eventTitle: event.title,
                  eventDate: event.eventDate,
                  actionDeadline: event.actionDeadline!,
                  childName: event.childName,
                });

                // Log successful send
                await ctx.runMutation(internal.notifications.logReminderSent, {
                  userId: user._id,
                  eventId: event._id,
                  reminderType: "rsvp_alert",
                  status: "sent",
                });
              } catch (error: any) {
                // Log failed send
                await ctx.runMutation(internal.notifications.logReminderSent, {
                  userId: user._id,
                  eventId: event._id,
                  reminderType: "rsvp_alert",
                  status: "failed",
                  errorMessage: error.message,
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error processing RSVP alerts for user ${user._id}:`, error);
        }
      }
    }
  },
});

// Helper queries for internal use
export const getAllFamilies = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("families").collect();
  },
});

export const getFamilyUsers = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

// Internal actions to actually send emails (placeholder - you'll need to implement with Resend or similar)
export const sendReminderEmail = internalAction({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
    userEmail: v.string(),
    eventTitle: v.string(),
    eventDate: v.string(),
    eventTime: v.optional(v.string()),
    eventLocation: v.optional(v.string()),
    childName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Implement with Resend, SendGrid, or similar email service
    console.log(`Sending reminder email to ${args.userEmail} for event: ${args.eventTitle}`);

    // For now, just log - in production you'd call an email API
    const eventTimeStr = args.eventTime ? ` at ${args.eventTime}` : "";
    const locationStr = args.eventLocation ? ` at ${args.eventLocation}` : "";
    const memberStr = args.childName ? ` for ${args.childName}` : "";

    console.log(`Event: ${args.eventTitle}${memberStr} on ${args.eventDate}${eventTimeStr}${locationStr}`);

    // Example with Resend (commented out):
    // await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     from: "Our Daily Family <reminders@ourdailyfamily.com>",
    //     to: args.userEmail,
    //     subject: `Reminder: ${args.eventTitle}`,
    //     html: `<h1>Event Reminder</h1><p>Don't forget about ${args.eventTitle}${memberStr} on ${args.eventDate}${eventTimeStr}${locationStr}</p>`,
    //   }),
    // });
  },
});

export const sendRSVPAlertEmail = internalAction({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
    userEmail: v.string(),
    eventTitle: v.string(),
    eventDate: v.string(),
    actionDeadline: v.string(),
    childName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Implement with Resend, SendGrid, or similar email service
    console.log(`Sending RSVP alert to ${args.userEmail} for event: ${args.eventTitle}`);

    const memberStr = args.childName ? ` for ${args.childName}` : "";
    console.log(`RSVP needed${memberStr} by ${args.actionDeadline} for ${args.eventTitle} on ${args.eventDate}`);

    // Example with Resend (commented out):
    // await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     from: "Family Schedule <reminders@familyschedule.app>",
    //     to: args.userEmail,
    //     subject: `Action Required: RSVP for ${args.eventTitle}`,
    //     html: `<h1>RSVP Deadline Approaching</h1><p>Don't forget to RSVP${memberStr} by ${args.actionDeadline} for ${args.eventTitle} on ${args.eventDate}</p>`,
    //   }),
    //   }),
    // });
  },
});
