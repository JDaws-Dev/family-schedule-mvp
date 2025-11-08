import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Generate instances of a recurring event
 * Creates individual event records for each occurrence based on recurrence rules
 */
export const generateRecurringInstances = internalMutation({
  args: {
    parentEventId: v.id("events"),
    generateUntilDate: v.optional(v.string()), // Optional limit for how far ahead to generate
  },
  handler: async (ctx, args) => {
    const parentEvent = await ctx.db.get(args.parentEventId);
    if (!parentEvent) {
      throw new Error("Parent event not found");
    }

    if (!parentEvent.isRecurring) {
      throw new Error("Event is not marked as recurring");
    }

    // Delete existing instances for this recurring event
    const existingInstances = await ctx.db
      .query("events")
      .withIndex("by_parent_recurring_event", (q) =>
        q.eq("parentRecurringEventId", args.parentEventId)
      )
      .collect();

    for (const instance of existingInstances) {
      await ctx.db.delete(instance._id);
    }

    // Calculate end date for generation
    let endDate: Date;
    if (parentEvent.recurrenceEndType === "date" && parentEvent.recurrenceEndDate) {
      endDate = new Date(parentEvent.recurrenceEndDate);
    } else if (args.generateUntilDate) {
      endDate = new Date(args.generateUntilDate);
    } else {
      // Default: generate 1 year ahead
      endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const startDate = new Date(parentEvent.eventDate);
    const instances: any[] = [];
    let currentDate = new Date(startDate);
    let instanceCount = 0;
    const maxInstances = parentEvent.recurrenceEndCount || 365; // Safety limit

    while (currentDate <= endDate && instanceCount < maxInstances) {
      // Skip the first instance if it's the parent event date
      if (currentDate.getTime() !== startDate.getTime()) {
        // Check if this date matches the recurrence pattern
        if (shouldCreateInstance(currentDate, startDate, parentEvent)) {
          instances.push({
            familyId: parentEvent.familyId,
            createdByUserId: parentEvent.createdByUserId,
            sourceGmailAccountId: parentEvent.sourceGmailAccountId,
            title: parentEvent.title,
            description: parentEvent.description,
            eventDate: formatDate(currentDate),
            eventTime: parentEvent.eventTime,
            endTime: parentEvent.endTime,
            location: parentEvent.location,
            category: parentEvent.category,
            childName: parentEvent.childName,
            sourceEmailId: parentEvent.sourceEmailId,
            sourceEmailSubject: parentEvent.sourceEmailSubject,
            requiresAction: parentEvent.requiresAction,
            actionDeadline: parentEvent.actionDeadline,
            actionDescription: parentEvent.actionDescription,
            actionCompleted: false,
            isConfirmed: true, // Auto-confirm recurring instances
            parentRecurringEventId: args.parentEventId,
            isRecurringInstance: true,
          });
          instanceCount++;
        }
      }

      // Increment date based on recurrence pattern
      currentDate = getNextDate(currentDate, parentEvent);
    }

    // Create all instances
    const createdIds: Id<"events">[] = [];
    for (const instance of instances) {
      const id = await ctx.db.insert("events", instance);
      createdIds.push(id);
    }

    return {
      instancesCreated: createdIds.length,
      instanceIds: createdIds,
    };
  },
});

/**
 * Check if an instance should be created for this date based on recurrence rules
 */
function shouldCreateInstance(
  currentDate: Date,
  startDate: Date,
  parentEvent: any
): boolean {
  if (!parentEvent.recurrencePattern) return false;

  const interval = parentEvent.recurrenceInterval || 1;

  switch (parentEvent.recurrencePattern) {
    case "daily":
      const daysDiff = Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysDiff % interval === 0;

    case "weekly":
      const weeksDiff = Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      if (weeksDiff % interval !== 0) return false;

      // Check if current day matches one of the selected days of week
      if (parentEvent.recurrenceDaysOfWeek && parentEvent.recurrenceDaysOfWeek.length > 0) {
        const dayName = getDayName(currentDate);
        return parentEvent.recurrenceDaysOfWeek.includes(dayName);
      }
      // If no days specified, use the same day as start date
      return currentDate.getDay() === startDate.getDay();

    case "monthly":
      // Same day of month
      if (currentDate.getDate() !== startDate.getDate()) return false;
      const monthsDiff =
        (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
        (currentDate.getMonth() - startDate.getMonth());
      return monthsDiff % interval === 0;

    case "yearly":
      // Same month and day
      if (
        currentDate.getMonth() !== startDate.getMonth() ||
        currentDate.getDate() !== startDate.getDate()
      )
        return false;
      const yearsDiff = currentDate.getFullYear() - startDate.getFullYear();
      return yearsDiff % interval === 0;

    default:
      return false;
  }
}

/**
 * Get the next date to check based on recurrence pattern
 */
function getNextDate(currentDate: Date, parentEvent: any): Date {
  const next = new Date(currentDate);
  const interval = parentEvent.recurrenceInterval || 1;

  switch (parentEvent.recurrencePattern) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      // If specific days are selected, increment by day
      if (parentEvent.recurrenceDaysOfWeek && parentEvent.recurrenceDaysOfWeek.length > 0) {
        next.setDate(next.getDate() + 1);
      } else {
        next.setDate(next.getDate() + (7 * interval));
      }
      break;
    case "monthly":
      next.setMonth(next.getMonth() + interval);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * Get day name from Date object
 */
function getDayName(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Delete all instances of a recurring event
 */
export const deleteRecurringInstances = mutation({
  args: {
    parentEventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const instances = await ctx.db
      .query("events")
      .withIndex("by_parent_recurring_event", (q) =>
        q.eq("parentRecurringEventId", args.parentEventId)
      )
      .collect();

    for (const instance of instances) {
      await ctx.db.delete(instance._id);
    }

    return { deletedCount: instances.length };
  },
});

/**
 * Get all instances of a recurring event
 */
export const getRecurringInstances = query({
  args: {
    parentEventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_parent_recurring_event", (q) =>
        q.eq("parentRecurringEventId", args.parentEventId)
      )
      .collect();
  },
});

/**
 * Update a single instance of a recurring event
 * Creates a detached copy if modifications are made
 */
export const updateRecurringInstance = mutation({
  args: {
    instanceId: v.id("events"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      eventDate: v.optional(v.string()),
      eventTime: v.optional(v.string()),
      endTime: v.optional(v.string()),
      location: v.optional(v.string()),
      category: v.optional(v.string()),
      childName: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) {
      throw new Error("Instance not found");
    }

    // Detach from recurring series
    await ctx.db.patch(args.instanceId, {
      ...args.updates,
      parentRecurringEventId: undefined,
      isRecurringInstance: false,
    });

    return { success: true };
  },
});
