/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calendarSync from "../calendarSync.js";
import type * as calendarWebhooks from "../calendarWebhooks.js";
import type * as crons from "../crons.js";
import type * as discover from "../discover.js";
import type * as emailProcessing from "../emailProcessing.js";
import type * as events from "../events.js";
import type * as families from "../families.js";
import type * as familyMembers from "../familyMembers.js";
import type * as gmailAccounts from "../gmailAccounts.js";
import type * as googleCalendar from "../googleCalendar.js";
import type * as linkedCalendars from "../linkedCalendars.js";
import type * as notifications from "../notifications.js";
import type * as recurringEvents from "../recurringEvents.js";
import type * as suggestedActivities from "../suggestedActivities.js";
import type * as syncStatus from "../syncStatus.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  calendarSync: typeof calendarSync;
  calendarWebhooks: typeof calendarWebhooks;
  crons: typeof crons;
  discover: typeof discover;
  emailProcessing: typeof emailProcessing;
  events: typeof events;
  families: typeof families;
  familyMembers: typeof familyMembers;
  gmailAccounts: typeof gmailAccounts;
  googleCalendar: typeof googleCalendar;
  linkedCalendars: typeof linkedCalendars;
  notifications: typeof notifications;
  recurringEvents: typeof recurringEvents;
  suggestedActivities: typeof suggestedActivities;
  syncStatus: typeof syncStatus;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
