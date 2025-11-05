import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for upcoming events and send reminders every hour
crons.hourly(
  "send-event-reminders",
  { minuteUTC: 0 }, // Run at the start of every hour
  internal.notifications.sendEventReminders
);

// Check for approaching RSVP deadlines every 6 hours
crons.interval(
  "check-rsvp-deadlines",
  { hours: 6 },
  internal.notifications.sendRSVPAlerts
);

// Discover new local activities daily at 2 AM
// NOTE: Commented out until discover feature is fully implemented
// crons.daily(
//   "discover-local-activities",
//   { hourUTC: 2, minuteUTC: 0 }, // Run at 2:00 AM UTC every day
//   internal.discover.runDailyDiscovery
// );

export default crons;
