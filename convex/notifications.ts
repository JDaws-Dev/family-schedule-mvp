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
        emailReminderHoursBefore: 24, // Email 24 hours before
        weeklyDigestEnabled: false,
        weeklyDigestDay: "Sunday",
        smsRemindersEnabled: false,
        smsReminderHoursBefore: 1, // SMS 1 hour before (urgent)
        dailySmsDigestEnabled: false,
        dailySmsDigestTime: "07:00", // 7am daily digest
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
    emailReminderHoursBefore: v.optional(v.number()),
    weeklyDigestEnabled: v.optional(v.boolean()),
    weeklyDigestDay: v.optional(v.string()),
    smsRemindersEnabled: v.optional(v.boolean()),
    smsReminderHoursBefore: v.optional(v.number()),
    dailySmsDigestEnabled: v.optional(v.boolean()),
    dailySmsDigestTime: v.optional(v.string()),
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
        emailReminderHoursBefore: updates.emailReminderHoursBefore ?? 24,
        weeklyDigestEnabled: updates.weeklyDigestEnabled ?? false,
        weeklyDigestDay: updates.weeklyDigestDay ?? "Sunday",
        smsRemindersEnabled: updates.smsRemindersEnabled ?? false,
        smsReminderHoursBefore: updates.smsReminderHoursBefore ?? 1,
        dailySmsDigestEnabled: updates.dailySmsDigestEnabled ?? false,
        dailySmsDigestTime: updates.dailySmsDigestTime ?? "07:00",
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

          if (!prefs.emailRemindersEnabled && !prefs.smsRemindersEnabled) continue;

          // Get events that need reminders
          const events = await ctx.runQuery(internal.notifications.getEventsNeedingReminders, {
            familyId: family._id,
          });

          const now = Date.now();
          const emailReminderWindowMs = prefs.emailReminderHoursBefore * 60 * 60 * 1000;
          const smsReminderWindowMs = prefs.smsReminderHoursBefore * 60 * 60 * 1000;

          for (const event of events) {
            // Calculate event datetime
            const eventDate = new Date(event.eventDate);
            if (event.eventTime) {
              const [hours, minutes] = event.eventTime.split(":");
              eventDate.setHours(parseInt(hours), parseInt(minutes));
            }

            const eventMs = eventDate.getTime();
            const timeDiff = eventMs - now;

            // Check if we should send EMAIL reminder
            if (prefs.emailRemindersEnabled && timeDiff > 0 && timeDiff <= emailReminderWindowMs) {
              const alreadySent = await ctx.runQuery(internal.notifications.wasReminderSent, {
                userId: user._id,
                eventId: event._id,
                reminderType: "email",
              });

              if (!alreadySent) {
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
                    reminderHoursBefore: prefs.emailReminderHoursBefore,
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

            // Check if we should send SMS reminder (separate timing window)
            if (prefs.smsRemindersEnabled && user.phoneNumber && timeDiff > 0 && timeDiff <= smsReminderWindowMs) {
              const alreadySentSMS = await ctx.runQuery(internal.notifications.wasReminderSent, {
                userId: user._id,
                eventId: event._id,
                reminderType: "sms",
              });

              if (!alreadySentSMS) {
                try {
                  await ctx.runAction(internal.notifications.sendReminderSMS, {
                    userId: user._id,
                    eventId: event._id,
                    phoneNumber: user.phoneNumber,
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
                    reminderType: "sms",
                    status: "sent",
                  });
                } catch (error: any) {
                  // Log failed send
                  await ctx.runMutation(internal.notifications.logReminderSent, {
                    userId: user._id,
                    eventId: event._id,
                    reminderType: "sms",
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

// Internal actions to actually send emails with Resend
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
    reminderHoursBefore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`Sending reminder email to ${args.userEmail} for event: ${args.eventTitle}`);

    const eventTimeStr = args.eventTime ? ` at ${args.eventTime}` : "";
    const locationStr = args.eventLocation ? ` at ${args.eventLocation}` : "";
    const memberStr = args.childName ? ` for ${args.childName}` : "";

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: args.userEmail,
        subject: `Reminder: ${args.eventTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .event-details { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #667eea; }
                .detail-item { margin: 10px 0; }
                .label { font-weight: bold; color: #667eea; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📅 Event Reminder</h1>
                </div>
                <div class="content">
                  <p>Hi! This is a reminder about an upcoming event${memberStr}.</p>
                  <div class="event-details">
                    <h2 style="margin-top: 0; color: #667eea;">${args.eventTitle}</h2>
                    <div class="detail-item">
                      <span class="label">📆 Date:</span> ${args.eventDate}${eventTimeStr}
                    </div>
                    ${args.eventLocation ? `<div class="detail-item"><span class="label">📍 Location:</span> ${args.eventLocation}</div>` : ''}
                    ${args.childName ? `<div class="detail-item"><span class="label">👤 For:</span> ${args.childName}</div>` : ''}
                    ${args.reminderHoursBefore ? `<div class="detail-item" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                      <span class="label">⏰ Reminder:</span> ${args.reminderHoursBefore} hours before the event
                    </div>` : ''}
                  </div>
                  <p style="margin-top: 20px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Calendar</a>
                  </p>
                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    Don't want these reminders? <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings" style="color: #667eea;">Update your notification settings</a>.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);
    return result;
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
    console.log(`Sending RSVP alert to ${args.userEmail} for event: ${args.eventTitle}`);

    const memberStr = args.childName ? ` for ${args.childName}` : "";

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: args.userEmail,
        subject: `⚠️ Action Required: RSVP for ${args.eventTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .alert-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 20px; }
                .deadline { font-size: 24px; font-weight: bold; color: #dc2626; text-align: center; margin: 15px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⚠️ RSVP Deadline Approaching</h1>
                </div>
                <div class="content">
                  <p><strong>Action required${memberStr}!</strong></p>
                  <div class="alert-box">
                    <h2 style="margin-top: 0; color: #dc2626;">${args.eventTitle}</h2>
                    <p><strong>Event Date:</strong> ${args.eventDate}</p>
                    <p><strong>RSVP Deadline:</strong></p>
                    <div class="deadline">${args.actionDeadline}</div>
                    <p style="margin-bottom: 0;">Don't forget to respond before the deadline!</p>
                  </div>
                  <p style="margin-top: 20px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Event Details</a>
                  </p>
                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    Questions? Visit your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings" style="color: #dc2626;">settings page</a>.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send RSVP alert email: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log("RSVP alert email sent successfully:", result);
    return result;
  },
});

// Internal action to send SMS reminder
export const sendReminderSMS = internalAction({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
    phoneNumber: v.string(),
    eventTitle: v.string(),
    eventDate: v.string(),
    eventTime: v.optional(v.string()),
    eventLocation: v.optional(v.string()),
    childName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`Sending reminder SMS to ${args.phoneNumber} for event: ${args.eventTitle}`);

    const eventTimeStr = args.eventTime ? ` at ${args.eventTime}` : "";
    const locationStr = args.eventLocation ? `\nLocation: ${args.eventLocation}` : "";
    const memberStr = args.childName ? ` for ${args.childName}` : "";

    const message = `Reminder${memberStr}: ${args.eventTitle}\nDate: ${args.eventDate}${eventTimeStr}${locationStr}`;

    // Send SMS via Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: args.phoneNumber,
          From: process.env.TWILIO_PHONE_NUMBER!,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Twilio API error:", error);
      throw new Error(`Failed to send SMS: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log("SMS sent successfully:", result);
    return result;
  },
});

// Send daily SMS digest with today's events
export const sendDailySmsDigests = internalAction({
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

          // Skip if daily SMS digest is disabled or no phone number
          if (!prefs.dailySmsDigestEnabled || !user.phoneNumber) continue;

          // Get today's events
          const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          const events = await ctx.runQuery(internal.notifications.getEventsNeedingReminders, {
            familyId: family._id,
          });

          // Filter to only today's events
          const todayEvents = events.filter((event) => event.eventDate === today);

          if (todayEvents.length === 0) continue; // No events today, skip

          // Build SMS message
          let message = `Good morning! Today's schedule (${todayEvents.length} event${todayEvents.length > 1 ? "s" : ""}):\n\n`;

          todayEvents.slice(0, 3).forEach((event, index) => {
            const timeStr = event.eventTime ? ` at ${event.eventTime}` : "";
            const childStr = event.childName ? ` - ${event.childName}` : "";
            message += `${index + 1}. ${event.title}${timeStr}${childStr}\n`;
          });

          if (todayEvents.length > 3) {
            message += `\n...and ${todayEvents.length - 3} more. Check the app for details.`;
          }

          // Send SMS
          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization:
                  "Basic " +
                  Buffer.from(
                    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
                  ).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: user.phoneNumber,
                From: process.env.TWILIO_PHONE_NUMBER!,
                Body: message,
              }),
            }
          );

          if (response.ok) {
            console.log(`Daily SMS digest sent to ${user.phoneNumber}`);
          } else {
            const error = await response.json();
            console.error("Failed to send daily SMS digest:", error);
          }
        } catch (error) {
          console.error(`Error sending daily SMS digest for user ${user._id}:`, error);
        }
      }
    }
  },
});
