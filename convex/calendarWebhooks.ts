import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Cron job: Renew expiring Google Calendar webhooks
 *
 * Runs daily at 3 AM UTC
 * Checks all families and renews webhooks that will expire within 24 hours
 */
export const renewExpiringWebhooks = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[webhook-renewal] Starting webhook renewal check...");

    try {
      // Get all families
      const families = await ctx.runQuery(internal.families.getAllFamiliesInternal);

      const now = Date.now();
      const oneDayFromNow = now + 24 * 60 * 60 * 1000;

      let renewedCount = 0;
      let skippedCount = 0;

      for (const family of families) {
        // Skip if no webhook is setup
        if (!family.calendarWebhookChannelId || !family.googleCalendarId) {
          skippedCount++;
          continue;
        }

        // Check if webhook will expire within the next 24 hours
        if (family.calendarWebhookExpiration && family.calendarWebhookExpiration < oneDayFromNow) {
          console.log(`[webhook-renewal] Renewing webhook for family: ${family.name} (expires ${new Date(family.calendarWebhookExpiration).toISOString()})`);

          try {
            // Call the setup-calendar-watch API to renew
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://family-schedule-mvp.vercel.app"}/api/setup-calendar-watch`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ familyId: family._id }),
            });

            if (response.ok) {
              renewedCount++;
              console.log(`[webhook-renewal] Successfully renewed webhook for family: ${family.name}`);
            } else {
              const error = await response.json();
              console.error(`[webhook-renewal] Failed to renew webhook for family: ${family.name}`, error);
            }
          } catch (error) {
            console.error(`[webhook-renewal] Error renewing webhook for family: ${family.name}`, error);
          }
        } else {
          // Webhook is still valid
          skippedCount++;
        }
      }

      console.log(`[webhook-renewal] Complete: ${renewedCount} renewed, ${skippedCount} skipped`);

      return {
        success: true,
        renewedCount,
        skippedCount,
        totalFamilies: families.length,
      };
    } catch (error: any) {
      console.error("[webhook-renewal] Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
