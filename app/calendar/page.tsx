"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams, useRouter } from "next/navigation";
import MobileNav from "@/app/components/MobileNav";
import BottomNav from "@/app/components/BottomNav";
import FAB from "@/app/components/FAB";
import { useToast } from "@/app/components/Toast";
import { CalendarSkeleton } from "@/app/components/LoadingSkeleton";
import AddEventChoiceModal from "@/app/components/AddEventChoiceModal";
import PhotoUploadModal from "@/app/components/PhotoUploadModal";
import VoiceRecordModal from "@/app/components/VoiceRecordModal";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import LoadingSpinner, { ButtonSpinner } from "@/app/components/LoadingSpinner";
import SwipeableCard from "@/app/components/SwipeableCard";
import PullToRefresh from "@/app/components/PullToRefresh";
import "./calendar.css";

// Helper function to convert 24-hour time to 12-hour format with AM/PM
function formatTime12Hour(time24: string): string {
  if (!time24) return "";

  const match = time24.match(/(\d{1,2}):(\d{2})/);
  if (!match) return time24;

  const hours = parseInt(match[1]);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${ampm}`;
}

// Helper function to get category color
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "Sports": "#10b981", // green
    "School": "#3b82f6", // blue
    "Music": "#8b5cf6", // purple
    "Dance": "#ec4899", // pink
    "Arts & Crafts": "#f59e0b", // amber
    "Tutoring": "#06b6d4", // cyan
    "Medical": "#ef4444", // red
    "Birthday Party": "#f97316", // orange
    "Play Date": "#14b8a6", // teal
    "Field Trip": "#eab308", // yellow
    "Club Meeting": "#6366f1", // indigo
    "Other": "#6b7280" // gray
  };
  return colors[category] || "#6b7280";
}

// Helper function to get category emoji
function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    "Sports": "⚽",
    "Soccer": "⚽",
    "Basketball": "🏀",
    "Football": "🏈",
    "Baseball": "⚾",
    "School": "🎒",
    "Music": "🎵",
    "Music Lessons": "🎹",
    "Dance": "💃",
    "Arts & Crafts": "🎨",
    "Art": "🎨",
    "Tutoring": "📚",
    "Medical": "🏥",
    "Doctor Appointment": "👨‍⚕️",
    "Birthday Party": "🎂",
    "Play Date": "🤸",
    "Playdate": "🤸",
    "Field Trip": "🚌",
    "Club Meeting": "👥",
    "Religious": "⛪",
    "Swimming": "🏊",
    "Gymnastics": "🤸",
    "Martial Arts": "🥋",
    "Theater": "🎭",
    "Social": "🍽️",
    "Family Event": "👨‍👩‍👧‍👦",
    "Movie Night": "🎬",
    "Lunch Meeting": "🍲",
    "Dinner Party": "🍽️",
    "Coffee Date": "☕",
    "Other": "🎈"
  };
  return emojis[category] || "🎈";
}

// Helper function to clean description text by removing redundant metadata lines
function cleanDescription(description: string): string {
  if (!description) return "";

  // Remove lines that start with redundant metadata
  const lines = description.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmedLine = line.trim();
    // Skip lines that are just metadata (Source:, Family Member:, Category:)
    if (trimmedLine.match(/^(Source|Family Member|Category):/i)) {
      return false;
    }
    return true;
  });

  return cleanedLines.join('\n').trim();
}

// Helper function to format date in mom-friendly format
function formatMomFriendlyDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if it's today or tomorrow
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return "Today";
  if (isTomorrow) return "Tomorrow";

  // Format as "Monday, November 12"
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

// Helper function to group events by date
function groupEventsByDate(events: any[]) {
  const grouped = events.reduce((acc: any, event: any) => {
    const date = event.eventDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {});

  // Sort dates
  return Object.keys(grouped)
    .sort()
    .map(date => ({
      date,
      events: grouped[date]
    }));
}

// Helper function to group events by week (for week view)
function groupEventsByWeek(events: any[], weekOffset: number = 0) {
  // Get start of current week (Sunday)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (weekOffset * 7));
  startOfWeek.setHours(0, 0, 0, 0);

  // Calculate end of week
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  // Filter events for this week only
  const weekEvents = events.filter(event => {
    const eventDate = new Date(event.eventDate + 'T00:00:00');
    return eventDate >= startOfWeek && eventDate < endOfWeek;
  });

  // Group by day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const grouped: any = {};

  dayNames.forEach((dayName, index) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + index);
    const dateStr = dayDate.toISOString().split('T')[0];
    grouped[dayName] = {
      date: dateStr,
      displayDate: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      events: weekEvents.filter(e => e.eventDate === dateStr)
    };
  });

  // Return grouped data with metadata
  return {
    grouped,
    startDate: startOfWeek,
    endDate: new Date(endOfWeek.getTime() - 1), // End is exclusive, so subtract 1ms for display
  };
}

function CalendarContent() {
  const { showToast } = useToast();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingFrom, setSyncingFrom] = useState(false);
  const hasSyncedFromRef = useRef(false);
  const hasSyncedToRef = useRef(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
  const [showAddEventChoiceModal, setShowAddEventChoiceModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [addEventTab, setAddEventTab] = useState<"manual" | "paste" | "photo" | "voice">("manual");
  const [pastedText, setPastedText] = useState("");
  const [isExtractingEvent, setIsExtractingEvent] = useState(false);
  const [conversationalInput, setConversationalInput] = useState("");
  const [isParsingConversational, setIsParsingConversational] = useState(false);
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [showVoiceRecordModal, setShowVoiceRecordModal] = useState(false);
  const [isEnhancingEvent, setIsEnhancingEvent] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    title: "",
    eventDate: "",
    eventTime: "",
    endTime: "",
    location: "",
    category: "Sports",
    childName: "",
    description: "",
    requiresAction: false,
    actionDescription: "",
    actionDeadline: "",
    isRecurring: false,
    recurrencePattern: "weekly" as "daily" | "weekly" | "monthly" | "yearly",
    recurrenceDaysOfWeek: [] as string[],
    recurrenceEndType: "never" as "date" | "count" | "never",
    recurrenceEndDate: "",
    recurrenceEndCount: 10,
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
    itemCount?: number;
  } | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = prev week, 1 = next week
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "week">("list");
  const { user: clerkUser} = useUser();
  const { signOut } = useClerk();
  const searchParams = useSearchParams();

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filterMember !== "all") count++;
    if (filterCategory !== "all") count++;
    if (dateRangeFilter !== "all") count++;
    return count;
  }, [searchQuery, filterMember, filterCategory, dateRangeFilter]);

  // Mutations
  const deleteEvent = useMutation(api.events.deleteEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const createUnconfirmedEvent = useMutation(api.events.createUnconfirmedEvent);
  const createEvent = useMutation(api.events.createEvent);

  // Get user from Convex
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Get all confirmed events
  const confirmedEvents = useQuery(
    api.events.getConfirmedEvents,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get family members for filtering
  const familyMembers = useQuery(
    api.familyMembers.getFamilyMembers,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get Gmail accounts to show source info
  const gmailAccounts = useQuery(
    api.gmailAccounts.getFamilyGmailAccounts,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get family data for last sync timestamp
  const family = useQuery(
    api.families.getFamilyById,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Standard preset categories
  const standardCategories = [
    "Sports",
    "School",
    "Music",
    "Dance",
    "Arts & Crafts",
    "Tutoring",
    "Medical",
    "Birthday Party",
    "Play Date",
    "Field Trip",
    "Club Meeting",
    "Movie Night",
    "Lunch Meeting",
    "Dinner Party",
    "Coffee Date",
    "Other"
  ];

  // First, filter events by search and family member (but not category yet)
  const preFilteredEvents = useMemo(() => {
    if (!confirmedEvents) return [];

    return confirmedEvents.filter(event => {
      // Search filter - check title, description, location
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesDescription = event.description?.toLowerCase().includes(query);
        const matchesLocation = event.location?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesLocation) {
          return false;
        }
      }

      // Family member filter - handle comma-separated names
      if (filterMember !== "all") {
        if (!event.childName) {
          return false;
        }
        // Check if filterMember is in the comma-separated list
        const names = event.childName.split(",").map((n: string) => n.trim());
        if (!names.includes(filterMember)) {
          return false;
        }
      }

      return true;
    });
  }, [confirmedEvents, searchQuery, filterMember]);

  // Extract unique categories from pre-filtered events (not all events)
  const existingCategories = useMemo(() => {
    if (!preFilteredEvents) return [];
    const uniqueCategories = new Set<string>();
    preFilteredEvents.forEach((event: any) => {
      if (event.category) uniqueCategories.add(event.category);
    });
    return Array.from(uniqueCategories).sort();
  }, [preFilteredEvents]);

  // Categories available for filtering (only those in current view)
  const categories = useMemo(() => {
    return existingCategories;
  }, [existingCategories]);

  // Final filter that includes category
  const filteredEvents = useMemo(() => {
    return preFilteredEvents.filter(event => {
      // Category filter
      if (filterCategory !== "all" && event.category !== filterCategory) {
        return false;
      }

      return true;
    });
  }, [preFilteredEvents, filterCategory]);

  // Sort filtered events
  // Sort events by date (upcoming first) and optionally filter by date
  const sortedEvents = useMemo(() => {
    if (!filteredEvents) return [];

    let events = [...filteredEvents];

    // Apply date range filter
    const today = new Date().toISOString().split('T')[0];

    if (dateRangeFilter === 'today') {
      events = events.filter(event => event.eventDate === today);
    } else if (dateRangeFilter === 'week') {
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      events = events.filter(event => event.eventDate >= today && event.eventDate <= weekFromNow);
    } else if (dateRangeFilter === 'month') {
      const monthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      events = events.filter(event => event.eventDate >= today && event.eventDate <= monthFromNow);
    } else if (showUpcomingOnly) {
      // Filter to upcoming only if toggle is on and no specific range is selected
      events = events.filter(event => event.eventDate >= today);
    }

    // Sort by date
    return events.sort((a, b) => {
      const dateComparison = a.eventDate.localeCompare(b.eventDate);
      if (dateComparison === 0 && a.eventTime && b.eventTime) {
        return a.eventTime.localeCompare(b.eventTime);
      }
      return dateComparison;
    });
  }, [filteredEvents, showUpcomingOnly, dateRangeFilter]);

  // Format last sync timestamp
  const formatLastSync = (timestamp: number | undefined): string => {
    if (!timestamp) return "Never saved to calendar";

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  // Sync events to Google Calendar
  const handleSyncAllToGoogleCalendar = useCallback(async () => {
    if (!confirmedEvents || syncing) return;

    setSyncing(true);
    let successCount = 0;
    let errorCount = 0;
    let needsReconnect = false;

    try {
      // Sync each event that doesn't have a Google Calendar ID yet
      for (const event of confirmedEvents) {
        if (!event.googleCalendarEventId) {
          try {
            const response = await fetch("/api/push-to-calendar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ eventId: event._id }),
            });

            if (response.ok) {
              successCount++;
            } else if (response.status === 403) {
              // Check if it's a permission error
              const data = await response.json();
              if (data.needsReconnect) {
                needsReconnect = true;
                break; // Stop syncing and prompt to reconnect
              }
              errorCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error(`Error syncing event ${event._id}:`, error);
            errorCount++;
          }
        }
      }

      if (needsReconnect) {
        const shouldReconnect = confirm(
          "Calendar permissions are required to sync events to Google Calendar.\n\n" +
          "Would you like to reconnect your Google account now to grant calendar access?"
        );
        if (shouldReconnect) {
          // Pass return URL to OAuth flow
          window.location.href = "/api/auth/google?returnUrl=/calendar";
        }
        return;
      }

      if (successCount > 0) {
        showToast(`Synced ${successCount} event${successCount !== 1 ? "s" : ""} to Google Calendar!`, "success");
      }
      // Don't show error toast for sync failures - events are already saved in the app
      if (successCount === 0 && errorCount === 0) {
        showToast("All events are already synced to Google Calendar!", "info");
      }
    } catch (error) {
      console.error("Error syncing to Google Calendar:", error);
      // Don't show error toast - events are still saved in the app
    } finally {
      setSyncing(false);
    }
  }, [confirmedEvents, syncing, showToast]);

  // Sync FROM Google Calendar to our site
  const handleSyncFromGoogleCalendar = useCallback(async () => {
    if (!convexUser?.familyId || syncingFrom) return;

    setSyncingFrom(true);

    try {
      const response = await fetch("/api/sync-from-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId: convexUser.familyId }),
      });

      const data = await response.json();

      if (response.ok) {
        const { addedCount, updatedCount } = data;
        if (addedCount > 0 || updatedCount > 0) {
          const parts: string[] = [];
          if (addedCount > 0) parts.push(`${addedCount} new event${addedCount !== 1 ? "s" : ""} added`);
          if (updatedCount > 0) parts.push(`${updatedCount} event${updatedCount !== 1 ? "s" : ""} updated`);
          showToast(`✓ Added from your phone's calendar: ${parts.join(", ")}!`, "success");
        } else {
          showToast("All events are already up to date!", "info");
        }
      } else if (response.status === 403 && data.needsReconnect) {
        // Calendar permission error - silently log, calendar display still works
        console.log("Calendar permission issue (background sync):", data.error);
      } else if (response.status === 404 && data.needsReconnect) {
        // No Google account connected  - silently skip for background sync
        console.log("No Gmail account connected for calendar sync");
      } else {
        // Don't show error toast for sync failures - calendar still displays local events
        console.log("Calendar sync failed:", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error syncing from Google Calendar:", error);
      // Silently log errors for background sync - don't alarm the user
      console.log("Background sync failed, will retry later");
    } finally {
      setSyncingFrom(false);
    }
  }, [convexUser, syncingFrom, showToast]);

  // Automatic background sync from Google Calendar (runs once when conditions are met)
  useEffect(() => {
    // Only sync once per page load
    if (hasSyncedFromRef.current) return;

    // Only sync if user and family are loaded
    if (!convexUser?.familyId || !family) return;

    // Don't sync if already syncing
    if (syncingFrom) return;

    // Check if Gmail account is connected before attempting sync
    if (!gmailAccounts || gmailAccounts.length === 0) {
      console.log("Skipping auto-sync: No Gmail account connected");
      hasSyncedFromRef.current = true;
      return;
    }

    // Check if enough time has passed since last sync (5 minutes)
    const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = Date.now();
    const lastSync = family.lastCalendarSyncAt || 0;
    const timeSinceLastSync = now - lastSync;

    if (timeSinceLastSync >= SYNC_INTERVAL) {
      console.log("Auto-syncing from Google Calendar...");
      hasSyncedFromRef.current = true; // Mark as synced to prevent retries
      handleSyncFromGoogleCalendar();
    }
  }, [convexUser?.familyId, family, syncingFrom, gmailAccounts, handleSyncFromGoogleCalendar]);

  // Automatic background sync TO Google Calendar (push unsynced events once when loaded)
  useEffect(() => {
    // Only sync once per page load
    if (hasSyncedToRef.current) return;

    // Only sync if we have events
    if (!confirmedEvents || confirmedEvents.length === 0) return;

    // Don't sync if already syncing
    if (syncing) return;

    // Find events that haven't been synced to Google Calendar
    const unsyncedEvents = confirmedEvents.filter(e => !e.googleCalendarEventId);

    if (unsyncedEvents.length > 0) {
      console.log(`Auto-syncing ${unsyncedEvents.length} events to Google Calendar...`);
      hasSyncedToRef.current = true; // Mark as synced to prevent retries
      handleSyncAllToGoogleCalendar();
    }
  }, [confirmedEvents, syncing, handleSyncAllToGoogleCalendar]);

  // Show success message after reconnecting Google account
  useEffect(() => {
    const success = searchParams.get("success");

    if (success === "gmail_connected") {
      // Clear the query params
      window.history.replaceState({}, "", "/calendar");

      // Show success message (10 seconds for important connection status)
      showToast("✓ Connected! Your events will automatically save to your phone's calendar.", "success", undefined, 10000);
    }
  }, [searchParams, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Note: 'T' keyboard shortcut removed - calendar now shows all events in chronological order

      // Press 'Escape' to close modals
      if (event.key === 'Escape') {
        if (selectedEvent) {
          setSelectedEvent(null);
          setEditingEvent(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvent, editingEvent, showToast]);

  // Transform Convex events to react-big-calendar format
  const calendarEvents = useMemo(() => {
    if (!filteredEvents) return [];

    return filteredEvents.map((event) => {
      // Parse the date and time
      const [year, month, day] = event.eventDate.split("-").map(Number);
      let start = new Date(year, month - 1, day);
      let end = new Date(year, month - 1, day);

      // If there's a time, parse it
      if (event.eventTime) {
        const timeMatch = event.eventTime.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          start.setHours(hours, minutes);
          end.setHours(hours + 1, minutes); // Default 1 hour duration
        }
      }

      // If there's an end time, use it
      if (event.endTime) {
        const endMatch = event.endTime.match(/(\d{1,2}):(\d{2})/);
        if (endMatch) {
          const hours = parseInt(endMatch[1]);
          const minutes = parseInt(endMatch[2]);
          end.setHours(hours, minutes);
        }
      }

      return {
        id: event._id,
        title: event.title,
        start,
        end,
        resource: event, // Store the full event data
      };
    });
  }, [filteredEvents]);

  const eventStyleGetter = (event: any) => {
    // Color code by child if available
    const childName = event.resource?.childName;
    let backgroundColor = "#6366f1"; // indigo default

    // If event has a family member, look up their color
    if (childName && familyMembers) {
      // Get first name from comma-separated list for multi-member events
      const firstName = childName.split(",")[0].trim();
      const member = familyMembers.find(m => m.name === firstName);
      if (member?.color) {
        backgroundColor = member.color;
      }
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource);
  };

  // Handle clicking on empty calendar slot to add new event
  const handleSelectSlot = (slotInfo: any) => {
    // Format the selected date as YYYY-MM-DD
    const selectedDate = new Date(slotInfo.start);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // Navigate to review page with the date pre-filled
    router.push(`/review?addEvent=true&date=${formattedDate}`);
  };

  // Handle photo upload for event extraction
  const handlePhotoUpload = async (file: File) => {
    if (!convexUser?.familyId) {
      showToast("Session expired. Please refresh the page and try again.", "error");
      setShowPhotoUploadModal(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("familyMembers", JSON.stringify(familyMembers || []));
      formData.append("currentUserName", convexUser?.fullName || "Unknown");

      const response = await fetch("/api/photo/extract-event", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to extract event from photo");
      }

      if (!data.hasEvents || !data.events || data.events.length === 0) {
        showToast("No event information found in the photo. " + (data.explanation || ""), "info", undefined, 7000);
        setShowPhotoUploadModal(false);
        return;
      }

      const categoryMap: {[key: string]: string} = {
        "sports": "Sports",
        "arts": "Lessons",
        "education": "School",
        "entertainment": "Other",
        "family": "Other",
        "other": "Other"
      };

      setShowPhotoUploadModal(false);

      // Create all events as unconfirmed
      let createdCount = 0;
      for (const event of data.events) {
        try {
          await createUnconfirmedEvent({
            familyId: convexUser.familyId,
            createdByUserId: convexUser._id,
            title: event.title || "Untitled Event",
            eventDate: event.date || "",
            eventTime: event.time || undefined,
            endTime: event.endTime || undefined,
            location: event.location || undefined,
            category: categoryMap[event.category] || "Other",
            childName: "",
            description: event.description || "",
          });
          createdCount++;
        } catch (err) {
          console.error("Error creating event:", err);
        }
      }

      if (createdCount > 0) {
        showToast(
          `✓ Created ${createdCount} event${createdCount > 1 ? 's' : ''} from photo! Check the Review page to edit and confirm.`,
          "success",
          () => {
            // Click toast to go to Review page
            window.location.href = "/review";
          },
          8000
        );
      } else {
        showToast("Failed to create events. Please try again.", "error");
      }
    } catch (error: any) {
      console.error("Error extracting event from photo:", error);
      showToast("Failed to extract event from photo. Please try again.", "error");
      setShowPhotoUploadModal(false);
    }
  };

  // Handle voice recording for event extraction
  const handleVoiceRecording = async (audioBlob: Blob) => {
    if (!convexUser?.familyId) {
      showToast("Session expired. Please refresh the page and try again.", "error");
      setShowVoiceRecordModal(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("familyMembers", JSON.stringify(familyMembers || []));
      formData.append("currentUserName", convexUser?.fullName || "Unknown");

      const response = await fetch("/api/voice/extract-event", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to extract event from voice recording");
      }

      if (!data.hasEvents || !data.events || data.events.length === 0) {
        showToast("No event information found in the recording. " + (data.explanation || ""), "info", undefined, 7000);
        setShowVoiceRecordModal(false);
        return;
      }

      const categoryMap: {[key: string]: string} = {
        "sports": "Sports",
        "arts": "Lessons",
        "education": "School",
        "entertainment": "Other",
        "family": "Other",
        "other": "Other"
      };

      setShowVoiceRecordModal(false);

      // Create all events as unconfirmed
      let createdCount = 0;
      for (const event of data.events) {
        try {
          await createUnconfirmedEvent({
            familyId: convexUser.familyId,
            createdByUserId: convexUser._id,
            title: event.title || "Untitled Event",
            eventDate: event.date || "",
            eventTime: event.time || undefined,
            endTime: event.endTime || undefined,
            location: event.location || undefined,
            category: categoryMap[event.category] || "Other",
            childName: "",
            description: event.description || "",
          });
          createdCount++;
        } catch (err) {
          console.error("Error creating event:", err);
        }
      }

      if (createdCount > 0) {
        showToast(
          `✓ Created ${createdCount} event${createdCount > 1 ? 's' : ''} from recording! Check the Review page to edit and confirm.`,
          "success",
          () => {
            // Click toast to go to Review page
            window.location.href = "/review";
          },
          8000
        );
      } else {
        showToast("Failed to create events. Please try again.", "error");
      }
    } catch (error: any) {
      console.error("Error extracting event from voice:", error);
      showToast("Failed to extract event from voice recording. Please try again.", "error");
      setShowVoiceRecordModal(false);
    }
  };

  // Handle AI enhancement for edit event modal
  const handleEnhanceEditEvent = async () => {
    if (!editFormData?.title) return;

    setIsEnhancingEvent(true);
    try {
      const response = await fetch("/api/enhance-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description || "",
          location: editFormData.location || "",
          date: editFormData.eventDate || "",
          time: editFormData.eventTime || "",
        }),
      });

      if (!response.ok) throw new Error("Enhancement failed");

      const data = await response.json();

      // Update editing event with all enhanced details
      setEditFormData({
        ...editFormData,
        description: data.description || editFormData.description,
        location: data.location || editFormData.location,
        category: data.category || editFormData.category,
        childName: data.childName || editFormData.childName,
      });

      showToast("✨ Event enhanced! AI filled in smart suggestions - review and adjust as needed.", "success");
    } catch (error) {
      console.error("Error enhancing event:", error);
      showToast("Failed to enhance event. Please try again.", "error");
    } finally {
      setIsEnhancingEvent(false);
    }
  };

  // Handle swipe delete with confirmation
  const handleSwipeDelete = async (event: any) => {
    // Show confirmation dialog
    setConfirmDialogConfig({
      title: 'Delete Event?',
      message: `Are you sure you want to delete "${event.title}"?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          // If event is synced with Google Calendar, try to delete from there first
          if (event.googleCalendarEventId) {
            try {
              const response = await fetch("/api/delete-calendar-event", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId: event._id }),
              });

              const result = await response.json();

              if (!response.ok) {
                console.warn("Could not delete from Google Calendar:", result);
                // Continue anyway - we'll delete from database
              }
            } catch (gcalError) {
              console.warn("Google Calendar deletion failed:", gcalError);
              // Continue anyway - we'll delete from database
            }
          }

          // Always delete from our database (even if Google Calendar deletion failed)
          await deleteEvent({ eventId: event._id });
          showToast("Event deleted successfully", "success");
        } catch (error) {
          console.error("Error deleting event:", error);
          showToast("Failed to delete event. Please try again.", "error");
        }

        setShowConfirmDialog(false);
        setConfirmDialogConfig(null);
      }
    });
    setShowConfirmDialog(true);
  };

  const handleExtractFromPaste = async () => {
    if (!pastedText.trim()) {
      showToast("Please paste some text first", "warning");
      return;
    }

    setIsExtractingEvent(true);
    try {
      const response = await fetch("/api/sms/extract-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smsText: pastedText,
          familyMembers: familyMembers || [],
          currentUserName: convexUser?.fullName || "Unknown"
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to extract event");
      }

      if (!data.hasEvents || !data.events || data.events.length === 0) {
        showToast("No event information found in the pasted text. " + (data.explanation || ""), "info", undefined, 7000);
        return;
      }

      // Map category from API format to our format
      const categoryMap: {[key: string]: string} = {
        "sports": "Sports",
        "arts": "Lessons",
        "education": "School",
        "entertainment": "Other",
        "family": "Other",
        "other": "Other"
      };

      // If multiple events found, create them all as unconfirmed events for review
      if (data.events.length > 1 && convexUser?.familyId) {
        let createdCount = 0;
        for (const event of data.events) {
          try {
            await createUnconfirmedEvent({
              familyId: convexUser.familyId,
              createdByUserId: convexUser._id,
              title: event.title || "Untitled Event",
              eventDate: event.date || "",
              eventTime: event.time || undefined,
              endTime: event.endTime || undefined,
              location: event.location || undefined,
              category: categoryMap[event.category] || "Other",
              childName: "",
              description: event.description || "",
            });
            createdCount++;
          } catch (err) {
            console.error("Error creating event:", err);
          }
        }
        setShowAddEventModal(false);
        setPastedText("");
        showToast(`✓ Found ${data.events.length} events! Go to Review page to approve them.`, "success", undefined, 7000);
      } else {
        // Single event - populate the form for manual review/editing
        const event = data.events[0];
        setNewEventForm({
          title: event.title || "",
          eventDate: event.date || "",
          eventTime: event.time || "",
          endTime: event.endTime || "",
          location: event.location || "",
          category: categoryMap[event.category] || "Other",
          childName: "",
          description: event.description || pastedText,
          requiresAction: false,
          actionDescription: "",
          actionDeadline: "",
          isRecurring: false,
          recurrencePattern: "weekly" as "daily" | "weekly" | "monthly" | "yearly",
          recurrenceDaysOfWeek: [] as string[],
          recurrenceEndType: "never" as "date" | "count" | "never",
          recurrenceEndDate: "",
          recurrenceEndCount: 10,
        });

        // Switch to manual tab so user can review/edit
        setAddEventTab("manual");
        showToast(`✓ Event extracted! Review and save below.`, "success", undefined, 5000);
        setPastedText(""); // Clear the paste field
      }
    } catch (error: any) {
      console.error("Error extracting event:", error);
      showToast("Failed to extract event. Please try again or enter manually.", "error");
    } finally {
      setIsExtractingEvent(false);
    }
  };

  const handleParseConversational = async () => {
    if (!conversationalInput.trim()) {
      showToast("Please describe your event first", "info");
      return;
    }

    setIsParsingConversational(true);
    try {
      const response = await fetch("/api/sms/extract-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smsText: conversationalInput,
          familyMembers: familyMembers || [],
          currentUserName: convexUser?.fullName || "Unknown"
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to parse event");
      }

      if (!data.hasEvents || !data.events || data.events.length === 0) {
        showToast("Couldn't find event details in that description. Try being more specific!", "info");
        return;
      }

      // Use the first event to fill the form
      const event = data.events[0];

      setNewEventForm({
        ...newEventForm,
        title: event.title || "",
        eventDate: event.date || "",
        eventTime: event.time || "",
        endTime: event.endTime || "",
        location: event.location || "",
        category: event.category || "Other",
        childName: event.childName || (event.attendees && event.attendees.length > 0 ? event.attendees.join(", ") : ""),
        description: event.description || "",
        requiresAction: event.requiresAction || false,
        actionDescription: event.actionDescription || "",
        actionDeadline: event.actionDeadline || "",
      });

      showToast("✨ Event extracted! Review and save.", "success");
      setConversationalInput(""); // Clear the input
      setAddEventTab("manual"); // Make sure we're on the manual tab
      setShowAddEventModal(true); // Open the modal with pre-filled data
    } catch (error: any) {
      console.error("Error parsing conversational input:", error);
      showToast("Failed to parse your description. Please try again or fill manually.", "error");
    } finally {
      setIsParsingConversational(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!convexUser?._id) {
      showToast("Session expired. Please refresh the page and try again.", "error");
      return;
    }

    if (!newEventForm.title.trim()) {
      showToast("Please enter an event title", "error");
      return;
    }

    if (!newEventForm.eventDate) {
      showToast("Please select a date for this event", "error");
      return;
    }

    try {
      const eventId = await createEvent({
        createdByUserId: convexUser._id,
        title: newEventForm.title.trim(),
        eventDate: newEventForm.eventDate,
        eventTime: newEventForm.eventTime || undefined,
        endTime: newEventForm.endTime || undefined,
        location: newEventForm.location.trim() || undefined,
        category: newEventForm.category || undefined,
        childName: newEventForm.childName.trim() || undefined,
        description: newEventForm.description.trim() || undefined,
        requiresAction: newEventForm.requiresAction || undefined,
        actionDescription: newEventForm.requiresAction ? newEventForm.actionDescription.trim() || undefined : undefined,
        actionDeadline: newEventForm.requiresAction ? newEventForm.actionDeadline || undefined : undefined,
        isConfirmed: true,
        // Recurring event fields
        isRecurring: newEventForm.isRecurring || undefined,
        recurrencePattern: newEventForm.isRecurring ? newEventForm.recurrencePattern : undefined,
        recurrenceDaysOfWeek: (newEventForm.isRecurring && newEventForm.recurrencePattern === "weekly" && newEventForm.recurrenceDaysOfWeek.length > 0) ? newEventForm.recurrenceDaysOfWeek : undefined,
        recurrenceEndType: newEventForm.isRecurring ? newEventForm.recurrenceEndType : undefined,
        recurrenceEndDate: (newEventForm.isRecurring && newEventForm.recurrenceEndType === "date") ? newEventForm.recurrenceEndDate || undefined : undefined,
        recurrenceEndCount: (newEventForm.isRecurring && newEventForm.recurrenceEndType === "count") ? newEventForm.recurrenceEndCount : undefined,
      });

      setNewEventForm({
        title: "",
        eventDate: "",
        eventTime: "",
        endTime: "",
        location: "",
        category: "Sports",
        childName: "",
        description: "",
        requiresAction: false,
        actionDescription: "",
        actionDeadline: "",
        isRecurring: false,
        recurrencePattern: "weekly" as "daily" | "weekly" | "monthly" | "yearly",
        recurrenceDaysOfWeek: [] as string[],
        recurrenceEndType: "never" as "date" | "count" | "never",
        recurrenceEndDate: "",
        recurrenceEndCount: 10,
      });

      setShowAddEventModal(false);
      setAddEventTab("manual");
      showToast(`✓ Event "${newEventForm.title}" added successfully!`, "success", undefined, 7000);

      // Automatically push to Google Calendar
      if (eventId) {
        try {
          await fetch("/api/push-to-calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId }),
          });
        } catch (error) {
          console.error("Failed to auto-sync to Google Calendar:", error);
          // Don't show error to user - the event was still created successfully
        }
      }
    } catch (error) {
      console.error("Error creating event:", error);
      showToast("Failed to add event. Please try again.", "error");
    }
  };

  const handleFABAction = (action: "manual" | "paste" | "photo" | "voice") => {
    switch (action) {
      case "manual":
        setShowAddEventModal(true);
        break;
      case "paste":
        setAddEventTab("paste");
        setShowAddEventModal(true);
        break;
      case "photo":
        setShowPhotoUploadModal(true);
        break;
      case "voice":
        setShowVoiceRecordModal(true);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Top Navigation Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-xl font-bold text-slate-900 hover:text-primary-600 transition">
              nufamly
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                Home
              </Link>
              <Link href="/calendar" className="text-sm font-medium text-primary-600 transition">
                Calendar
              </Link>
              <Link href="/review" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                Events
              </Link>
              <Link href="/discover" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                Discover
              </Link>
              <Link href="/settings" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                Settings

              </Link>
              <Link href="/support" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                Support
              </Link>
            </nav>

            {/* Mobile Hamburger Menu */}
            <button
              className="md:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <MobileNav
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        currentPage="calendar"
      />

      <PullToRefresh onRefresh={async () => {
        // Trigger a refetch of events
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.reload(); // Simple reload for now
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                  {family?.calendarName || "Family Calendar"}
                </h1>
                <p className="text-gray-600 text-lg mt-1">
                  Life, organized together
                </p>
              </div>
            </div>

            {/* Google Calendar Button - Desktop Only */}
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              View in Google Calendar
            </a>
          </div>
        </div>

        {/* View Toggle Buttons */}
        {confirmedEvents && confirmedEvents.length > 0 && (
          <div className="flex items-center gap-2 mb-4 bg-white rounded-lg p-2 shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
                viewMode === "list"
                  ? "bg-primary-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              List
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
                viewMode === "week"
                  ? "bg-primary-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Week
            </button>
          </div>
        )}


        {/* Simplified Filter UI - Collapsible (List View Only) */}
        {viewMode === 'list' && confirmedEvents && confirmedEvents.length > 0 && (
          <div className="mb-4 bg-white rounded-xl shadow-sm">
            {/* Filter Toggle Button */}
            <div className="p-3 flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] flex-1 sm:flex-none"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="font-medium text-gray-700">
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-primary-600 text-white rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </span>
                <svg className={`w-4 h-4 text-gray-600 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterMember("all");
                    setFilterCategory("all");
                    setDateRangeFilter("all");
                  }}
                  className="px-3 py-2.5 text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap min-h-[44px]"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Collapsible Filter Panel */}
            {showFilters && (
              <div className="px-3 pb-3 border-t border-gray-200 pt-3 space-y-3 animate-slideDown">
                {/* Search */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Search</label>
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
                  />
                </div>

                {/* Date Range - Desktop only */}
                <div className="hidden sm:block">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date Range</label>
                  <select
                    value={dateRangeFilter}
                    onChange={(e) => setDateRangeFilter(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm min-h-[44px]"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">Next 7 Days</option>
                    <option value="month">Next 30 Days</option>
                  </select>
                </div>

                {/* Member and Category - Grid layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Family Member</label>
                    <select
                      value={filterMember}
                      onChange={(e) => setFilterMember(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm min-h-[44px]"
                    >
                      <option value="all">All Members</option>
                      {familyMembers?.map((member) => (
                        <option key={member._id} value={member.name}>{member.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm min-h-[44px]"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* List View */}
        <div className="bg-white rounded-lg shadow">
            {confirmedEvents === undefined ? (
              <CalendarSkeleton />
            ) : sortedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">☕</div>
                <div className="text-xl font-semibold text-gray-900 mb-2">
                  Nothing scheduled yet!
                </div>
                <p className="text-gray-600 mb-4">
                  Enjoy the free time or add your first event to get started.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/review"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
                  >
                    Add Events
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Filter Toggle and Add Event Button */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  {/* Bulk Selection Bar */}
                  {selectedEventIds.size > 0 && (
                    <div className="mb-4 bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-center justify-between gap-3 animate-slideDown">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-primary-900">
                          {selectedEventIds.size} event{selectedEventIds.size > 1 ? 's' : ''} selected
                        </span>
                        <button
                          onClick={() => setSelectedEventIds(new Set())}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white rounded-lg transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDialogConfig({
                              title: 'Delete Multiple Events?',
                              message: `Are you sure you want to delete ${selectedEventIds.size} event${selectedEventIds.size > 1 ? 's' : ''}?`,
                              variant: 'danger',
                              itemCount: selectedEventIds.size,
                              onConfirm: async () => {
                                try {
                                  const idsToDelete = Array.from(selectedEventIds);
                                  const eventsToDelete = sortedEvents?.filter((e: any) => idsToDelete.includes(e._id));
                                  const eventBackups = eventsToDelete?.map((e: any) => ({ ...e })) || [];

                                  for (const id of idsToDelete) {
                                    await deleteEvent({ eventId: id as any });
                                  }

                                  setSelectedEventIds(new Set());
                                  setShowConfirmDialog(false);

                                  // Show toast with undo option
                                  showToast(
                                    `${idsToDelete.length} event${idsToDelete.length > 1 ? 's' : ''} deleted`,
                                    "success",
                                    async () => {
                                      // Undo: recreate all events
                                      try {
                                        for (const backup of eventBackups) {
                                          await createEvent({
                                            createdByUserId: backup.createdByUserId,
                                            title: backup.title,
                                            eventDate: backup.eventDate,
                                            eventTime: backup.eventTime || undefined,
                                            endTime: backup.endTime || undefined,
                                            location: backup.location || undefined,
                                            category: backup.category || undefined,
                                            childName: backup.childName || undefined,
                                            description: backup.description || undefined,
                                            requiresAction: backup.requiresAction || false,
                                            actionDescription: backup.actionDescription || undefined,
                                            actionDeadline: backup.actionDeadline || undefined,
                                            isConfirmed: backup.isConfirmed,
                                          });
                                        }
                                        showToast(`${eventBackups.length} event${eventBackups.length > 1 ? 's' : ''} restored`, "success");
                                      } catch (error) {
                                        console.error("Error restoring events:", error);
                                        showToast("Unable to restore events. Please try adding them again manually.", "error");
                                      }
                                    },
                                    10000
                                  );
                                } catch (error) {
                                  console.error("Error deleting events:", error);
                                  showToast("Unable to delete some events. Please try again.", "error");
                                  setShowConfirmDialog(false);
                                }
                              },
                            });
                            setShowConfirmDialog(true);
                          }}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors min-h-[44px] sm:min-h-[36px]"
                        >
                          Delete Selected
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      {/* Select All Checkbox - Hidden on mobile */}
                      {sortedEvents && sortedEvents.length > 0 && (
                        <label className="hidden lg:flex items-center gap-2 cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={sortedEvents.every((e: any) => selectedEventIds.has(e._id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const allIds = new Set(sortedEvents.map((event: any) => event._id));
                                setSelectedEventIds(allIds);
                              } else {
                                setSelectedEventIds(new Set());
                              }
                            }}
                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700">Select All</span>
                        </label>
                      )}

                      <button
                        onClick={() => setShowUpcomingOnly(!showUpcomingOnly)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                          showUpcomingOnly ? 'bg-primary-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className="sr-only">Toggle upcoming only</span>
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            showUpcomingOnly ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <span className="text-sm font-medium text-gray-700">
                        {showUpcomingOnly ? 'Showing upcoming events only' : 'Showing all events'}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAddEventChoiceModal(true)}
                      className="hidden lg:flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-all shadow-sm hover:shadow-md"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Add Event</span>
                    </button>
                  </div>
                </div>
              </>
            )}
        </div>

        {/* Conditional View Rendering */}
        {viewMode === "list" && (
          <>
            {/* Events List - Grouped by date */}
            <div className="space-y-6 p-4">
              {groupEventsByDate(sortedEvents).map(({ date, events }) => (
                <div key={date}>
                      {/* Date Header - More playful */}
                      <div className="mb-3">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          {formatMomFriendlyDate(date)}
                        </h3>
                      </div>
                      {/* Events for this day - Simplified card style */}
                      <div className="space-y-2">
                        {events.map((event: any) => (
                          <SwipeableCard
                            key={event._id}
                            onSwipeLeft={async () => {
                              // Delete on swipe left - show confirmation dialog
                              setConfirmDialogConfig({
                                title: 'Delete Event?',
                                message: `Are you sure you want to delete "${event.title}"?`,
                                variant: 'danger',
                                onConfirm: async () => {
                                  try {
                                    const eventBackup = { ...event };
                                    await deleteEvent({ eventId: event._id });
                                    setShowConfirmDialog(false);

                                    // Show undo toast
                                    showToast(
                                      'Event deleted',
                                      'success',
                                      async () => {
                                        await createEvent({
                                          createdByUserId: eventBackup.createdByUserId,
                                          title: eventBackup.title,
                                          eventDate: eventBackup.eventDate,
                                          eventTime: eventBackup.eventTime || undefined,
                                          endTime: eventBackup.endTime || undefined,
                                          location: eventBackup.location || undefined,
                                          category: eventBackup.category || undefined,
                                          childName: eventBackup.childName || undefined,
                                          description: eventBackup.description || undefined,
                                          requiresAction: eventBackup.requiresAction || false,
                                          actionDescription: eventBackup.actionDescription || undefined,
                                          actionDeadline: eventBackup.actionDeadline || undefined,
                                          isConfirmed: eventBackup.isConfirmed,
                                        });
                                        showToast('Event restored', 'success');
                                      },
                                      10000
                                    );
                                  } catch (error) {
                                    console.error('Error deleting event:', error);
                                    showToast('Unable to delete event. Please try again.', 'error');
                                    setShowConfirmDialog(false);
                                  }
                                },
                              });
                              setShowConfirmDialog(true);
                            }}
                            onSwipeRight={async () => {
                              // Mark as complete on swipe right (if action required)
                              if (event.requiresAction && !event.actionCompleted) {
                                try {
                                  await updateEvent({
                                    eventId: event._id,
                                    actionCompleted: true,
                                  });
                                  showToast('Action marked as complete!', 'success');
                                } catch (error) {
                                  console.error('Error updating event:', error);
                                  showToast('Unable to update event. Please try again.', 'error');
                                }
                              }
                            }}
                          >
                          <div
                            className={`bg-white rounded-xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-all border ${
                              selectedEventIds.has(event._id)
                                ? 'border-primary-400 bg-primary-50'
                                : 'border-gray-200 hover:border-primary-300'
                            } active:scale-[0.99]`}
                          >
                            <div className="flex gap-3 items-start">
                              {/* Checkbox for bulk selection - Hidden on mobile */}
                              <div className="hidden lg:flex flex-shrink-0 pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={selectedEventIds.has(event._id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const newSet = new Set(selectedEventIds);
                                    if (e.target.checked) {
                                      newSet.add(event._id);
                                    } else {
                                      newSet.delete(event._id);
                                    }
                                    setSelectedEventIds(newSet);
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                  aria-label={`Select ${event.title}`}
                                />
                              </div>

                              {/* Event Details - Compact */}
                              <div
                                onClick={() => setSelectedEvent(event)}
                                className="flex-1 min-w-0 cursor-pointer"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-900 text-base">
                                    {event.category && <span className="mr-1">{getCategoryEmoji(event.category)}</span>}
                                    {event.title}
                                  </h3>
                                  {event.category && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 whitespace-nowrap">
                                      {event.category}
                                    </span>
                                  )}
                                </div>

                                {/* Family Members */}
                                {event.childName && (
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {event.childName.split(',').map((name: string, idx: number) => {
                                      const memberName = name.trim();
                                      const member = familyMembers?.find(m => m.name === memberName);
                                      const color = member?.color || "#6366f1";
                                      return (
                                        <span
                                          key={idx}
                                          className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                                          style={{ backgroundColor: color }}
                                        >
                                          {memberName}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                                  {event.eventTime && (
                                    <span className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {formatTime12Hour(event.eventTime)}
                                    </span>
                                  )}
                                  {event.location && (
                                    <span className="flex items-center gap-1 truncate">
                                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      <span className="truncate">{event.location}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Action tag if needed */}
                                {event.requiresAction && !event.actionCompleted && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-2 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    {event.actionDescription || 'Action Needed'}
                                  </span>
                                )}
                              </div>

                              {/* Delete Button - Always visible on the right */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSwipeDelete(event);
                                }}
                                className="flex-shrink-0 min-w-[44px] min-h-[44px] p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                aria-label="Delete event"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          </SwipeableCard>
                        ))}
                      </div>
                    </div>
                      ))}
                    </div>
          </>
        )}

        {/* Week View */}
        {viewMode === "week" && (
          <div className="bg-white rounded-lg shadow p-4">
            {/* Week Navigation Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                {/* Previous Week Button */}
                <button
                  onClick={() => setWeekOffset(weekOffset - 1)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Previous week"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Date Range Display */}
                <div className="flex-1 text-center">
                  <h2 className="text-lg font-bold text-gray-900">
                    {(() => {
                      const weekData = groupEventsByWeek(sortedEvents, weekOffset);
                      const startStr = weekData.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const endStr = weekData.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      return `${startStr} - ${endStr}`;
                    })()}
                  </h2>
                  {weekOffset !== 0 && (
                    <button
                      onClick={() => setWeekOffset(0)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-1"
                    >
                      Back to Today
                    </button>
                  )}
                </div>

                {/* Next Week Button */}
                <button
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Next week"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {Object.entries(groupEventsByWeek(sortedEvents, weekOffset).grouped).map(([dayName, dayData]: [string, any]) => (
                <div key={dayName} className="bg-gray-50 rounded-lg p-3">
                  <div className="font-bold text-sm text-gray-900 mb-1">{dayName}</div>
                  <div className="text-xs text-gray-600 mb-2">{dayData.displayDate}</div>
                  <div className="space-y-2">
                    {dayData.events.length === 0 ? (
                      <div className="text-xs text-gray-400 italic">No events</div>
                    ) : (
                      dayData.events.map((event: any) => (
                        <div
                          key={event._id}
                          onClick={() => setSelectedEvent(event)}
                          className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="font-medium text-sm text-gray-900 mb-1">
                            {event.category && <span className="mr-1">{getCategoryEmoji(event.category)}</span>}
                            {event.title}
                          </div>
                          {event.eventTime && (
                            <div className="text-xs text-gray-600">
                              {formatTime12Hour(event.eventTime)}
                            </div>
                          )}
                          {event.childName && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {event.childName.split(',').map((name: string, idx: number) => {
                                const memberName = name.trim();
                                const member = familyMembers?.find(m => m.name === memberName);
                                const color = member?.color || "#6366f1";
                                return (
                                  <span
                                    key={idx}
                                    className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                                    style={{ backgroundColor: color }}
                                  >
                                    {memberName}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      </PullToRefresh>

      {/* Enhanced Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-strong my-4 md:my-8 flex flex-col"
            style={{ maxHeight: 'calc(85vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-primary-400 to-primary-500 rounded-t-2xl p-6">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-2xl font-bold text-white pr-8">{selectedEvent.title}</h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                  aria-label="Close event details"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-white/80 text-xs font-medium mb-1">Date</div>
                  <div className="text-white font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {new Date(selectedEvent.eventDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                {selectedEvent.eventTime && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-white/80 text-xs font-medium mb-1">Time</div>
                    <div className="text-white font-semibold flex items-center gap-2">
                      🕐 {formatTime12Hour(selectedEvent.eventTime)}
                      {selectedEvent.endTime && ` - ${formatTime12Hour(selectedEvent.endTime)}`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Description Section */}
              {selectedEvent.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                    Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4">
                    {cleanDescription(selectedEvent.description)}
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {selectedEvent.location && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Location
                    </div>
                    <div className="text-gray-900 font-medium flex items-start gap-2">
                      <span>📍</span>
                      <span>{selectedEvent.location}</span>
                    </div>
                  </div>
                )}

                {selectedEvent.category && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Category
                    </div>
                    <div className="text-gray-900 font-medium">
                      {selectedEvent.category}
                    </div>
                  </div>
                )}

                {selectedEvent.childName && (
                  <div className="bg-gray-50 rounded-lg p-4 sm:col-span-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Family Members
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.childName.split(',').map((name: string, idx: number) => {
                        const trimmedName = name.trim();
                        const member = familyMembers?.find(m => m.name === trimmedName);
                        const color = member?.color || "#6366f1";
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: color }}
                          >
                            {trimmedName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Required Badge */}
              {selectedEvent.requiresAction && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900 mb-1">
                        Action Required: RSVP
                      </h4>
                      {selectedEvent.actionDeadline && (
                        <p className="text-sm text-red-700">
                          Deadline: {new Date(selectedEvent.actionDeadline).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Source Information */}
              {selectedEvent.sourceEmailSubject && (
                <div className="mb-6 bg-primary-50 rounded-lg p-4">
                  <div className="text-xs font-semibold text-primary-800 uppercase tracking-wide mb-2">
                    Source Information
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-primary-800">
                      <span className="font-medium">Email:</span> {selectedEvent.sourceEmailSubject}
                    </div>
                    {selectedEvent.sourceGmailAccountId && gmailAccounts && (
                      <div className="text-sm text-primary-700">
                        <span className="font-medium">Account:</span> {gmailAccounts.find(a => a._id === selectedEvent.sourceGmailAccountId)?.gmailEmail || 'Unknown'}
                      </div>
                    )}
                    <a
                      href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`subject:"${selectedEvent.sourceEmailSubject}"`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary-500 hover:text-primary-700 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View in Gmail
                    </a>
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* Fixed Action Buttons Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4 rounded-b-2xl flex flex-col sm:flex-row gap-3">
              {/* Edit Button */}
              <button
                onClick={() => {
                  setEditFormData({
                    title: selectedEvent.title,
                    eventDate: selectedEvent.eventDate,
                    eventTime: selectedEvent.eventTime || "",
                    endTime: selectedEvent.endTime || "",
                    location: selectedEvent.location || "",
                    childName: selectedEvent.childName || "",
                    category: selectedEvent.category || "",
                    description: selectedEvent.description || "",
                    requiresAction: selectedEvent.requiresAction || false,
                    actionDescription: selectedEvent.actionDescription || "",
                    actionDeadline: selectedEvent.actionDeadline || "",
                    actionCompleted: selectedEvent.actionCompleted || false,
                    isRecurring: selectedEvent.isRecurring || false,
                    recurrencePattern: selectedEvent.recurrencePattern || "weekly",
                    recurrenceDaysOfWeek: selectedEvent.recurrenceDaysOfWeek || [],
                    recurrenceEndType: selectedEvent.recurrenceEndType || "never",
                    recurrenceEndDate: selectedEvent.recurrenceEndDate || "",
                    recurrenceEndCount: selectedEvent.recurrenceEndCount || 10,
                  });
                  setEditingEvent(true);
                }}
                className="min-h-[48px] px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 active:scale-[0.98] transition shadow-soft flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>

              {/* Close Button */}
              <button
                onClick={() => setSelectedEvent(null)}
                className="min-h-[48px] px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                Close
              </button>

              {/* Delete Button - Destructive action last */}
              <button
                onClick={async () => {
                  if (confirm(`Delete "${selectedEvent.title}"?`)) {
                    try {
                      // If event is synced with Google Calendar, try to delete from there first
                      if (selectedEvent.googleCalendarEventId) {
                        try {
                          const response = await fetch("/api/delete-calendar-event", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ eventId: selectedEvent._id }),
                          });

                          const result = await response.json();

                          if (!response.ok) {
                            console.warn("Could not delete from Google Calendar:", result);
                            // Continue anyway - we'll delete from database
                          }
                        } catch (gcalError) {
                          console.warn("Google Calendar deletion failed:", gcalError);
                          // Continue anyway - we'll delete from database
                        }
                      }

                      // Always delete from our database (even if Google Calendar deletion failed)
                      await deleteEvent({ eventId: selectedEvent._id });
                      setSelectedEvent(null);
                      showToast("Event deleted successfully", "success");
                    } catch (error) {
                      console.error("Error deleting event:", error);
                      showToast("Failed to delete event. Please try again.", "error");
                    }
                  }
                }}
                className="min-h-[48px] px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 active:scale-[0.98] transition shadow-soft flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => {
            setEditingEvent(false);
            setEditFormData(null);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-strong my-4 md:my-8 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-400 to-primary-500 rounded-t-2xl p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-white">Edit Event</h2>
                <button
                  onClick={() => {
                    setEditingEvent(false);
                    setEditFormData(null);
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                  aria-label="Close edit modal"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Edit Form */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editFormData?.title || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editFormData?.eventDate || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, eventDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editFormData?.eventTime || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, eventTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={editFormData?.endTime || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={editFormData?.location || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Family Members</label>
                <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
                  {familyMembers && familyMembers.length > 0 ? (
                    familyMembers.map((member) => {
                      const selectedMembers = editFormData?.childName ? editFormData.childName.split(", ") : [];
                      const isChecked = selectedMembers.includes(member.name);

                      return (
                        <button
                          key={member._id}
                          type="button"
                          onClick={() => {
                            let updatedMembers = [...selectedMembers];
                            if (isChecked) {
                              updatedMembers = updatedMembers.filter(m => m !== member.name);
                            } else {
                              updatedMembers.push(member.name);
                            }
                            setEditFormData({
                              ...editFormData,
                              childName: updatedMembers.join(", ")
                            });
                          }}
                          className={`px-3 py-2 rounded-lg border-2 transition-all font-medium ${
                            isChecked
                              ? 'border-primary-600 shadow-md'
                              : 'bg-white border-gray-300 hover:border-gray-400'
                          }`}
                          style={{
                            backgroundColor: isChecked ? member.color || "#6366f1" : undefined,
                            color: isChecked ? "white" : "#374151"
                          }}
                        >
                          {isChecked && <span className="mr-1">✓</span>}
                          {member.name}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">No family members added yet</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editFormData?.category || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "custom") {
                      const customCategory = prompt("Enter custom category:");
                      if (customCategory && customCategory.trim()) {
                        setEditFormData({ ...editFormData, category: customCategory.trim() });
                      }
                    } else {
                      setEditFormData({ ...editFormData, category: value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a category...</option>
                  {/* Standard Categories */}
                  <optgroup label="Standard Categories">
                    {standardCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                  {/* Previously Used Categories (if any new ones) */}
                  {existingCategories.filter(cat => !standardCategories.includes(cat)).length > 0 && (
                    <optgroup label="Your Categories">
                      {existingCategories
                        .filter(cat => !standardCategories.includes(cat))
                        .map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))
                      }
                    </optgroup>
                  )}
                  <option value="custom">+ Add Custom Category</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editFormData?.description || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Action Items Section */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="editRequiresAction"
                    checked={editFormData?.requiresAction || false}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      requiresAction: e.target.checked,
                      actionDescription: e.target.checked ? (editFormData?.actionDescription || "") : "",
                      actionDeadline: e.target.checked ? (editFormData?.actionDeadline || "") : "",
                      actionCompleted: e.target.checked ? (editFormData?.actionCompleted || false) : false
                    })}
                    className="w-5 h-5 text-secondary-500 rounded focus:ring-2 focus:ring-secondary-400 mt-0.5"
                  />
                  <label htmlFor="editRequiresAction" className="flex-1 cursor-pointer">
                    <span className="block text-sm font-semibold text-gray-900">
                      This event requires action
                    </span>
                    <span className="block text-xs text-gray-600 mt-0.5">
                      RSVP, payment, form submission, or other follow-up needed
                    </span>
                  </label>
                </div>

                {editFormData?.requiresAction && (
                  <div className="space-y-3 pl-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        What action is needed?
                      </label>
                      <input
                        type="text"
                        value={editFormData?.actionDescription || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, actionDescription: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-orange-500"
                        placeholder="e.g., RSVP by email, Pay $50, Sign permission slip"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Action deadline
                      </label>
                      <input
                        type="date"
                        value={editFormData?.actionDeadline || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, actionDeadline: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-orange-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-secondary-50 p-3 rounded-lg border border-secondary-200">
                      <input
                        type="checkbox"
                        id="editActionCompleted"
                        checked={editFormData?.actionCompleted || false}
                        onChange={(e) => setEditFormData({ ...editFormData, actionCompleted: e.target.checked })}
                        className="w-4 h-4 text-primary-500 rounded focus:ring-2 focus:ring-primary-400"
                      />
                      <label htmlFor="editActionCompleted" className="text-sm font-medium text-gray-900 cursor-pointer">
                        ✓ Action completed
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Recurring Event Section */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="editIsRecurring"
                    checked={editFormData?.isRecurring || false}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      isRecurring: e.target.checked,
                      recurrenceDaysOfWeek: e.target.checked ? (editFormData?.recurrenceDaysOfWeek || []) : []
                    })}
                    className="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-400 mt-0.5"
                  />
                  <label htmlFor="editIsRecurring" className="flex-1 cursor-pointer">
                    <span className="block text-sm font-semibold text-gray-900">
                      This is a recurring event
                    </span>
                    <span className="block text-xs text-gray-600 mt-0.5">
                      Event repeats on a regular schedule
                    </span>
                  </label>
                </div>

                {editFormData?.isRecurring && (
                  <div className="space-y-3 pl-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repeats
                      </label>
                      <select
                        value={editFormData?.recurrencePattern || "weekly"}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          recurrencePattern: e.target.value as "daily" | "weekly" | "monthly" | "yearly"
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    {editFormData?.recurrencePattern === "weekly" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Repeat on
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                            const recurrenceDays = editFormData?.recurrenceDaysOfWeek || [];
                            const isSelected = recurrenceDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  const days = isSelected
                                    ? recurrenceDays.filter(d => d !== day)
                                    : [...recurrenceDays, day];
                                  setEditFormData({
                                    ...editFormData,
                                    recurrenceDaysOfWeek: days
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                  isSelected
                                    ? "bg-primary-500 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {day.substring(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ends
                      </label>
                      <select
                        value={editFormData?.recurrenceEndType || "never"}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          recurrenceEndType: e.target.value as "date" | "count" | "never"
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500"
                      >
                        <option value="never">Never</option>
                        <option value="date">On a specific date</option>
                        <option value="count">After a number of occurrences</option>
                      </select>
                    </div>

                    {editFormData?.recurrenceEndType === "date" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End date
                        </label>
                        <input
                          type="date"
                          value={editFormData?.recurrenceEndDate || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, recurrenceEndDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500"
                        />
                      </div>
                    )}

                    {editFormData?.recurrenceEndType === "count" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of occurrences
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={editFormData?.recurrenceEndCount || 10}
                          onChange={(e) => setEditFormData({ ...editFormData, recurrenceEndCount: parseInt(e.target.value) || 10 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleEnhanceEditEvent}
                disabled={isEnhancingEvent || !editFormData?.title?.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnhancingEvent ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enhancing...
                  </>
                ) : (
                  <>
                    ✨ Enhance with AI
                  </>
                )}
              </button>
              <button
                onClick={async () => {
                  try {
                    // Update in Convex database
                    await updateEvent({
                      eventId: selectedEvent._id,
                      title: editFormData.title,
                      eventDate: editFormData.eventDate,
                      eventTime: editFormData.eventTime || undefined,
                      endTime: editFormData.endTime || undefined,
                      location: editFormData.location || undefined,
                      childName: editFormData.childName || undefined,
                      category: editFormData.category || undefined,
                      description: editFormData.description || undefined,
                      requiresAction: editFormData.requiresAction || undefined,
                      actionDescription: editFormData.requiresAction ? editFormData.actionDescription || undefined : undefined,
                      actionDeadline: editFormData.requiresAction ? editFormData.actionDeadline || undefined : undefined,
                      actionCompleted: editFormData.requiresAction ? editFormData.actionCompleted || undefined : undefined,
                      // Recurring event fields
                      isRecurring: editFormData.isRecurring || undefined,
                      recurrencePattern: editFormData.isRecurring ? editFormData.recurrencePattern : undefined,
                      recurrenceDaysOfWeek: (editFormData.isRecurring && editFormData.recurrencePattern === "weekly" && editFormData.recurrenceDaysOfWeek && editFormData.recurrenceDaysOfWeek.length > 0) ? editFormData.recurrenceDaysOfWeek : undefined,
                      recurrenceEndType: editFormData.isRecurring ? editFormData.recurrenceEndType : undefined,
                      recurrenceEndDate: (editFormData.isRecurring && editFormData.recurrenceEndType === "date") ? editFormData.recurrenceEndDate || undefined : undefined,
                      recurrenceEndCount: (editFormData.isRecurring && editFormData.recurrenceEndType === "count") ? editFormData.recurrenceEndCount : undefined,
                    });

                    // Update in Google Calendar if it was synced
                    if (selectedEvent.googleCalendarEventId) {
                      try {
                        await fetch("/api/update-calendar-event", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ eventId: selectedEvent._id }),
                        });
                      } catch (error) {
                        console.error("Error updating Google Calendar:", error);
                        // Show warning but don't fail the entire operation
                        showToast("Event updated here, but couldn't save to your phone's calendar", "info");
                      }
                    }

                    showToast("Event updated successfully", "success");
                    setEditingEvent(false);
                    setEditFormData(null);
                    setSelectedEvent(null);
                  } catch (error) {
                    console.error("Error updating event:", error);
                    showToast("Failed to update event. Please try again.", "error");
                  }
                }}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition shadow-soft flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditingEvent(false);
                  setEditFormData(null);
                }}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Choice Modal */}
      {showAddEventChoiceModal && (
        <AddEventChoiceModal
          onClose={() => setShowAddEventChoiceModal(false)}
          onCheckEmails={() => router.push('/dashboard#search-emails')}
          onTypeManually={() => {
            setShowAddEventChoiceModal(false);
            setShowAddEventModal(true);
          }}
          onPasteText={() => {
            setShowAddEventChoiceModal(false);
            setAddEventTab("paste");
            setShowAddEventModal(true);
          }}
          onUploadPhoto={() => {
            setShowAddEventChoiceModal(false);
            setShowPhotoUploadModal(true);
          }}
          onVoiceRecord={() => {
            setShowAddEventChoiceModal(false);
            setShowVoiceRecordModal(true);
          }}
          onSearchSpecific={() => router.push('/dashboard#search-specific')}
          isGmailConnected={!!gmailAccounts && gmailAccounts.length > 0}
        />
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto pb-24 md:pb-4"
          onClick={() => {
            setShowAddEventModal(false);
            setAddEventTab("manual");
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-strong my-4 md:my-8 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-primary-400 to-primary-500 rounded-t-2xl p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {addEventTab === "paste" ? (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Paste Text to Extract Event
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Manually Add Event
                    </>
                  )}
                </h2>
                <button
                  onClick={() => {
                    setShowAddEventModal(false);
                    setAddEventTab("manual");
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                  aria-label="Close add event modal"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Paste Text Content */}
            {addEventTab === "paste" && (
              <div className="p-6 space-y-4">
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-primary-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-primary-800 mb-1">How it works</h4>
                      <p className="text-sm text-primary-700">
                        Paste an email, text message, or any text containing event information. Our AI will automatically extract the event details for you!
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Email or Text Message
                  </label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Paste your email or text message here...

Example:
'Soccer practice this Saturday at 9am at Memorial Park. Please bring water and shin guards!'"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleExtractFromPaste}
                    disabled={isExtractingEvent || !pastedText.trim()}
                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-soft flex items-center justify-center gap-2"
                  >
                    {isExtractingEvent ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Extracting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Extract Event
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEventModal(false);
                      setAddEventTab("manual");
                      setPastedText("");
                    }}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Manual Entry Tab */}
            {addEventTab === "manual" && (
              <form onSubmit={handleAddEvent}>
              <div className="p-6 space-y-6">
                {/* Conversational Input - Quick AI Fill */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-2xl">💬</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Quick Add with AI</h3>
                      <p className="text-sm text-gray-600">
                        Describe your event naturally and let AI fill out the form for you!
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={conversationalInput}
                      onChange={(e) => setConversationalInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleParseConversational())}
                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder='e.g., "Emma has soccer every Tuesday at 5pm" or "dentist tomorrow at 3"'
                    />
                    <button
                      type="button"
                      onClick={handleParseConversational}
                      disabled={isParsingConversational || !conversationalInput.trim()}
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isParsingConversational ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Parsing...
                        </>
                      ) : (
                        <>
                          ✨ Auto-Fill Form
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or fill out manually</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newEventForm.title}
                    onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Soccer Practice"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventForm.eventDate}
                    onChange={(e) => setNewEventForm({ ...newEventForm, eventDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newEventForm.eventTime}
                      onChange={(e) => setNewEventForm({ ...newEventForm, eventTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={newEventForm.endTime}
                      onChange={(e) => setNewEventForm({ ...newEventForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newEventForm.location}
                    onChange={(e) => setNewEventForm({ ...newEventForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Local Soccer Field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Family Members</label>
                  <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
                    {familyMembers && familyMembers.length > 0 ? (
                      [...familyMembers].sort((a, b) => a.name.localeCompare(b.name)).map((member) => {
                        const selectedMembers = newEventForm.childName ? newEventForm.childName.split(", ") : [];
                        const isChecked = selectedMembers.includes(member.name);

                        return (
                          <button
                            key={member._id}
                            type="button"
                            onClick={() => {
                              let updatedMembers = [...selectedMembers];
                              if (isChecked) {
                                updatedMembers = updatedMembers.filter(m => m !== member.name);
                              } else {
                                updatedMembers.push(member.name);
                              }
                              setNewEventForm({
                                ...newEventForm,
                                childName: updatedMembers.join(", ")
                              });
                            }}
                            className={`px-3 py-2 rounded-lg border-2 transition-all font-medium ${
                              isChecked
                                ? 'border-primary-600 shadow-md'
                                : 'bg-white border-gray-300 hover:border-gray-400'
                            }`}
                            style={{
                              backgroundColor: isChecked ? member.color || "#6366f1" : undefined,
                              color: isChecked ? "white" : "#374151"
                            }}
                          >
                            {isChecked && <span className="mr-1">✓</span>}
                            {member.name}
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500">No family members added yet. Add them in Settings.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newEventForm.category}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "custom") {
                        const customCategory = prompt("Enter custom category:");
                        if (customCategory && customCategory.trim()) {
                          setNewEventForm({ ...newEventForm, category: customCategory.trim() });
                        }
                      } else {
                        setNewEventForm({ ...newEventForm, category: value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a category...</option>
                    {/* Standard Categories */}
                    <optgroup label="Standard Categories">
                      {standardCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                    {/* Previously Used Categories (if any new ones) */}
                    {existingCategories.filter(cat => !standardCategories.includes(cat)).length > 0 && (
                      <optgroup label="Your Categories">
                        {existingCategories
                          .filter(cat => !standardCategories.includes(cat))
                          .map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))
                        }
                      </optgroup>
                    )}
                    <option value="custom">+ Add Custom Category</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newEventForm.description}
                    onChange={(e) => setNewEventForm({ ...newEventForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Add any additional details..."
                  />
                </div>

                {/* Action Items Section */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="requiresAction"
                      checked={newEventForm.requiresAction}
                      onChange={(e) => setNewEventForm({
                        ...newEventForm,
                        requiresAction: e.target.checked,
                        actionDescription: e.target.checked ? newEventForm.actionDescription : "",
                        actionDeadline: e.target.checked ? newEventForm.actionDeadline : ""
                      })}
                      className="w-5 h-5 text-secondary-500 rounded focus:ring-2 focus:ring-secondary-400 mt-0.5"
                    />
                    <label htmlFor="requiresAction" className="flex-1 cursor-pointer">
                      <span className="block text-sm font-semibold text-gray-900">
                        This event requires action
                      </span>
                      <span className="block text-xs text-gray-600 mt-0.5">
                        RSVP, payment, form submission, or other follow-up needed
                      </span>
                    </label>
                  </div>

                  {newEventForm.requiresAction && (
                    <div className="space-y-3 pl-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          What action is needed?
                        </label>
                        <input
                          type="text"
                          value={newEventForm.actionDescription}
                          onChange={(e) => setNewEventForm({ ...newEventForm, actionDescription: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-orange-500"
                          placeholder="e.g., RSVP by email, Pay $50, Sign permission slip"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Action deadline
                        </label>
                        <input
                          type="date"
                          value={newEventForm.actionDeadline}
                          onChange={(e) => setNewEventForm({ ...newEventForm, actionDeadline: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-orange-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Recurring Event Section */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={newEventForm.isRecurring}
                      onChange={(e) => setNewEventForm({
                        ...newEventForm,
                        isRecurring: e.target.checked,
                        recurrenceDaysOfWeek: e.target.checked ? newEventForm.recurrenceDaysOfWeek : []
                      })}
                      className="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-400 mt-0.5"
                    />
                    <label htmlFor="isRecurring" className="flex-1 cursor-pointer">
                      <span className="block text-sm font-semibold text-gray-900">
                        This is a recurring event
                      </span>
                      <span className="block text-xs text-gray-600 mt-0.5">
                        Event repeats on a regular schedule
                      </span>
                    </label>
                  </div>

                  {newEventForm.isRecurring && (
                    <div className="space-y-3 pl-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repeats
                        </label>
                        <select
                          value={newEventForm.recurrencePattern}
                          onChange={(e) => setNewEventForm({
                            ...newEventForm,
                            recurrencePattern: e.target.value as "daily" | "weekly" | "monthly" | "yearly"
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>

                      {newEventForm.recurrencePattern === "weekly" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Repeat on
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                              const isSelected = newEventForm.recurrenceDaysOfWeek.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const days = isSelected
                                      ? newEventForm.recurrenceDaysOfWeek.filter(d => d !== day)
                                      : [...newEventForm.recurrenceDaysOfWeek, day];
                                    setNewEventForm({
                                      ...newEventForm,
                                      recurrenceDaysOfWeek: days
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                    isSelected
                                      ? "bg-primary-500 text-white"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                  }`}
                                >
                                  {day.substring(0, 3)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ends
                        </label>
                        <select
                          value={newEventForm.recurrenceEndType}
                          onChange={(e) => setNewEventForm({
                            ...newEventForm,
                            recurrenceEndType: e.target.value as "date" | "count" | "never"
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500"
                        >
                          <option value="never">Never</option>
                          <option value="date">On a specific date</option>
                          <option value="count">After a number of occurrences</option>
                        </select>
                      </div>

                      {newEventForm.recurrenceEndType === "date" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            End date
                          </label>
                          <input
                            type="date"
                            value={newEventForm.recurrenceEndDate}
                            onChange={(e) => setNewEventForm({ ...newEventForm, recurrenceEndDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500"
                          />
                        </div>
                      )}

                      {newEventForm.recurrenceEndType === "count" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of occurrences
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={newEventForm.recurrenceEndCount}
                            onChange={(e) => setNewEventForm({ ...newEventForm, recurrenceEndCount: parseInt(e.target.value) || 10 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition shadow-soft flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Add Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  Cancel
                </button>
              </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoUploadModal && (
        <PhotoUploadModal
          onClose={() => setShowPhotoUploadModal(false)}
          onExtract={handlePhotoUpload}
        />
      )}

      {/* Voice Record Modal */}
      {showVoiceRecordModal && (
        <VoiceRecordModal
          onClose={() => setShowVoiceRecordModal(false)}
          onTranscribe={handleVoiceRecording}
        />
      )}

      {/* Confirm Dialog */}
      {showConfirmDialog && confirmDialogConfig && (
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onCancel={() => {
            setShowConfirmDialog(false);
            setConfirmDialogConfig(null);
          }}
          onConfirm={confirmDialogConfig.onConfirm}
          title={confirmDialogConfig.title}
          message={confirmDialogConfig.message}
          variant={confirmDialogConfig.variant}
          itemCount={confirmDialogConfig.itemCount}
        />
      )}

      {/* FAB for Mobile */}
      <FAB
        onAction={handleFABAction}
        hasGmailAccount={!!gmailAccounts && gmailAccounts.length > 0}
      />

      {/* Bottom Navigation (Mobile) */}
      <BottomNav />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <CalendarSkeleton />
        </div>
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}
