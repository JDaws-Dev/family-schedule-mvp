import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Family Accounts - One subscription, shared calendar
  families: defineTable({
    name: v.optional(v.string()), // e.g., "The Smith Family"
    primaryEmail: v.optional(v.string()), // Primary contact email for the family
    phoneNumber: v.optional(v.string()), // Primary contact phone number
    enableSmsNotifications: v.optional(v.boolean()), // Whether SMS notifications are enabled
    emailDigestFrequency: v.optional(v.union(v.literal("none"), v.literal("daily"), v.literal("weekly"))), // Email digest frequency
    stripeCustomerId: v.optional(v.string()),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("canceled"),
        v.literal("past_due"),
        v.literal("trialing")
      )
    ),
    subscriptionTier: v.optional(v.literal("standard")), // $9.99/month plan
    trialEndsAt: v.optional(v.number()),
    createdAt: v.number(),
    // Location for activity discovery
    location: v.optional(v.string()), // City/Zip code for discovering local activities
    // Google Calendar Integration
    googleCalendarId: v.optional(v.string()), // The shared "Family Activities" calendar ID
    calendarName: v.optional(v.string()), // e.g., "Smith Family Activities"
    lastCalendarSyncAt: v.optional(v.number()), // Last time calendar was synced
    // Google Calendar Push Notifications (Webhooks)
    calendarWebhookChannelId: v.optional(v.string()), // Unique ID for webhook channel
    calendarWebhookResourceId: v.optional(v.string()), // Google resource ID for webhook
    calendarWebhookExpiration: v.optional(v.number()), // Webhook expiration timestamp (ms)
    // Custom event categories
    customCategories: v.optional(v.array(v.string())), // User-created custom categories
  }).index("by_stripe_customer", ["stripeCustomerId"]),

  // Individual Users - Multiple users can belong to one family
  users: defineTable({
    email: v.string(),
    fullName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    familyId: v.id("families"), // Links user to their family account
    role: v.union(v.literal("primary"), v.literal("spouse")), // Primary is the account owner
    clerkId: v.string(), // Using Clerk for auth
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"])
    .index("by_family", ["familyId"]),

  // Gmail Accounts - Multiple Gmail accounts can be connected per family
  gmailAccounts: defineTable({
    familyId: v.id("families"), // All accounts belong to the family
    connectedByUserId: v.id("users"), // Who connected this account
    gmailEmail: v.string(), // The Gmail address
    displayName: v.optional(v.string()), // e.g., "Mom's Work Email", "Dad's Personal"
    accessToken: v.string(),
    refreshToken: v.string(),
    connectedAt: v.number(),
    lastSyncAt: v.optional(v.number()),
    isActive: v.boolean(), // Can be disabled without deleting
    gmailPushTopicName: v.optional(v.string()), // For Gmail push notifications
    gmailHistoryId: v.optional(v.string()), // For incremental sync
    // Gmail Push Notification Status
    gmailPushEnabled: v.optional(v.boolean()), // Whether push notifications are active
    gmailPushChannelId: v.optional(v.string()), // Channel ID from Gmail watch
    gmailPushExpiration: v.optional(v.number()), // When the watch expires (timestamp)
    gmailPushError: v.optional(v.string()), // Error message from last push setup attempt
    gmailPushLastSetup: v.optional(v.number()), // Timestamp of last successful setup
  })
    .index("by_family", ["familyId"])
    .index("by_gmail_email", ["gmailEmail"]),

  // Email sender whitelist/blacklist for smart filtering
  emailFilters: defineTable({
    familyId: v.id("families"),
    senderEmail: v.optional(v.string()), // e.g., "coach@soccerleague.com"
    senderDomain: v.optional(v.string()), // e.g., "soccerleague.com"
    filterType: v.union(
      v.literal("always_scan"), // Always process emails from this sender
      v.literal("never_scan"), // Skip emails from this sender
      v.literal("learned") // AI learned this should be scanned
    ),
    confidence: v.optional(v.number()), // 0-1, how confident AI is this is activity-related
    addedByUserId: v.optional(v.id("users")),
    addedAt: v.number(),
    lastSeenAt: v.optional(v.number()),
    eventsFoundCount: v.number(), // Track how many events came from this sender
  })
    .index("by_family", ["familyId"])
    .index("by_sender_email", ["senderEmail"])
    .index("by_sender_domain", ["senderDomain"]),

  events: defineTable({
    familyId: v.id("families"), // All family members see the same events
    createdByUserId: v.id("users"), // Track who added/imported the event
    sourceGmailAccountId: v.optional(v.id("gmailAccounts")), // Which Gmail account this came from
    title: v.string(),
    description: v.optional(v.string()),
    eventDate: v.string(), // ISO date string YYYY-MM-DD
    eventTime: v.optional(v.string()), // HH:MM format
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    category: v.optional(v.string()), // sports, lessons, appointments, school, etc.
    childName: v.optional(v.string()),
    sourceEmailId: v.optional(v.string()), // Gmail message ID
    sourceEmailSubject: v.optional(v.string()),
    requiresAction: v.optional(v.boolean()),
    actionDeadline: v.optional(v.string()),
    actionDescription: v.optional(v.string()),
    actionCompleted: v.optional(v.boolean()),
    isConfirmed: v.boolean(), // User has confirmed the extracted event
    // Recurring events
    isRecurring: v.optional(v.boolean()), // Whether this event repeats
    recurrencePattern: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly")
    )), // How it repeats
    recurrenceInterval: v.optional(v.number()), // e.g., 1 for weekly, 2 for biweekly
    recurrenceDaysOfWeek: v.optional(v.array(v.union(
      v.literal("Sunday"),
      v.literal("Monday"),
      v.literal("Tuesday"),
      v.literal("Wednesday"),
      v.literal("Thursday"),
      v.literal("Friday"),
      v.literal("Saturday")
    ))), // For weekly recurrence
    recurrenceEndType: v.optional(v.union(
      v.literal("date"), // Ends on specific date
      v.literal("count"), // Ends after N occurrences
      v.literal("never") // Never ends (or ends far in future)
    )),
    recurrenceEndDate: v.optional(v.string()), // YYYY-MM-DD when recurrence stops
    recurrenceEndCount: v.optional(v.number()), // How many occurrences total
    parentRecurringEventId: v.optional(v.id("events")), // Link to parent recurring event for instances
    isRecurringInstance: v.optional(v.boolean()), // True if this is an instance of a recurring event
    // Google Calendar sync
    googleCalendarEventId: v.optional(v.string()), // For two-way sync
    lastSyncedAt: v.optional(v.number()),
    // Sync status tracking for retry mechanism
    syncStatus: v.optional(v.union(
      v.literal("pending"),   // Not yet synced, waiting to sync
      v.literal("syncing"),   // Currently being synced
      v.literal("synced"),    // Successfully synced to Google Calendar
      v.literal("failed")     // Sync failed, needs retry
    )),
    syncError: v.optional(v.string()), // Error message from last sync attempt
    lastSyncAttempt: v.optional(v.number()), // Timestamp of last sync attempt
    syncRetryCount: v.optional(v.number()), // Number of retry attempts made
  })
    .index("by_family", ["familyId"])
    .index("by_family_and_date", ["familyId", "eventDate"])
    .index("by_confirmed", ["isConfirmed"])
    .index("by_google_event_id", ["googleCalendarEventId"])
    .index("by_parent_recurring_event", ["parentRecurringEventId"])
    .index("by_sync_status", ["syncStatus"])
    .index("by_family_and_sync_status", ["familyId", "syncStatus"]),

  emailProcessingLog: defineTable({
    gmailAccountId: v.id("gmailAccounts"), // Which Gmail account this email came from
    gmailMessageId: v.string(),
    subject: v.optional(v.string()),
    fromEmail: v.optional(v.string()),
    receivedDate: v.optional(v.number()),
    eventsExtracted: v.number(),
    processingStatus: v.union(
      v.literal("pending"),
      v.literal("processed"),
      v.literal("error"),
      v.literal("skipped")
    ),
    errorMessage: v.optional(v.string()),
    aiResponse: v.optional(v.any()), // Store the full AI extraction response
  })
    .index("by_gmail_account", ["gmailAccountId"])
    .index("by_message_id", ["gmailMessageId"]),

  remindersSent: defineTable({
    userId: v.id("users"),
    eventId: v.optional(v.id("events")),
    reminderType: v.union(v.literal("email"), v.literal("sms"), v.literal("digest"), v.literal("rsvp_alert")),
    status: v.union(v.literal("sent"), v.literal("failed")),
    sentAt: v.number(),
    errorMessage: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    // Email preferences (for detailed info & digests)
    emailRemindersEnabled: v.boolean(),
    emailReminderHoursBefore: v.optional(v.number()), // Hours before event to send email reminder (default: 24)
    weeklyDigestEnabled: v.boolean(),
    weeklyDigestDay: v.string(), // Day of week for digest
    // SMS preferences (for urgent/immediate notifications)
    smsRemindersEnabled: v.boolean(),
    smsReminderHoursBefore: v.optional(v.number()), // Hours before event to send SMS (default: 1)
    dailySmsDigestEnabled: v.optional(v.boolean()), // One daily SMS with today's events
    dailySmsDigestTime: v.optional(v.string()), // Time to send daily SMS (HH:MM format, e.g., "07:00")
    // Email scanning
    autoScanEmails: v.boolean(),
    scanIntervalHours: v.number(), // How often to scan emails
    // Legacy field - kept for backwards compatibility with existing data
    reminderHoursBefore: v.optional(v.number()), // DEPRECATED: Use emailReminderHoursBefore instead
  }).index("by_user", ["userId"]),

  // Family Members to Track (children, relatives, etc.)
  familyMembers: defineTable({
    familyId: v.id("families"),
    name: v.string(),
    birthdate: v.optional(v.string()), // YYYY-MM-DD
    relationship: v.optional(v.string()), // "Son", "Daughter", etc.
    nicknames: v.array(v.string()), // Alternate names used in emails
    interests: v.array(v.string()), // Activities they're interested in
    color: v.optional(v.string()), // Hex color code for calendar display (e.g., "#FF5733")
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_family", ["familyId"]),

  // Family member invitations
  familyInvitations: defineTable({
    familyId: v.id("families"),
    invitedByUserId: v.id("users"),
    inviteeEmail: v.string(),
    invitationCode: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_family", ["familyId"])
    .index("by_email", ["inviteeEmail"])
    .index("by_code", ["invitationCode"]),

  // Local activity suggestions (AI-discovered activities in their area)
  suggestedActivities: defineTable({
    familyId: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(), // "sports", "arts", "education", "entertainment", etc.
    type: v.optional(v.union(v.literal("event"), v.literal("place"))), // NEW: distinguish events from ongoing places
    ageRange: v.optional(v.string()), // e.g., "5-12 years"
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    priceRange: v.optional(v.string()), // "Free", "$", "$$", "$$$"
    distance: v.optional(v.number()), // Distance from family in miles
    rating: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    sourceUrl: v.optional(v.string()), // Where we found this info
    sourceName: v.optional(v.string()), // Name of the source (e.g., "Library", "Parks Dept")
    sourceLocation: v.optional(v.string()), // Location of the source (e.g., "30519")
    aiSummary: v.optional(v.string()), // AI-generated summary of why this is good for their family
    // Event date/time information (for type="event")
    date: v.optional(v.string()), // YYYY-MM-DD
    time: v.optional(v.string()), // HH:MM (24-hour format)
    endTime: v.optional(v.string()), // HH:MM (24-hour format)
    recurring: v.optional(v.boolean()),
    registrationRequired: v.optional(v.boolean()),
    registrationDeadline: v.optional(v.string()), // YYYY-MM-DD
    // Place information (for type="place")
    hoursOfOperation: v.optional(v.string()), // e.g., "Mon-Fri 9am-5pm, Sat-Sun 10am-6pm"
    admission: v.optional(v.string()), // e.g., "Free", "$15 adults, $10 children"
    amenities: v.optional(v.array(v.string())), // e.g., ["playground", "splash pad", "parking"]
    // Metadata
    scrapedAt: v.optional(v.string()), // Timestamp when the event was scraped
    sourceCategories: v.optional(v.array(v.string())), // Categories from the source
    targetMembers: v.optional(v.array(v.string())), // Family member names who would enjoy this
    matchScore: v.optional(v.number()), // AI match score (0-100)
    status: v.union(
      v.literal("suggested"), // AI suggested, not yet reviewed
      v.literal("interested"), // Family marked as interested
      v.literal("dismissed"), // Family not interested
      v.literal("added") // Added to their calendar
    ),
    suggestedAt: v.number(),
    dismissedAt: v.optional(v.number()),
  })
    .index("by_family", ["familyId"])
    .index("by_status", ["status"])
    .index("by_family_and_status", ["familyId", "status"]),
});
