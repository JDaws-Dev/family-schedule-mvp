"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import * as React from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "../components/Toast";
import { SyncStatus } from "../components/SyncStatus";
import { EventCardSkeleton, StatCardSkeleton } from "../components/LoadingSkeleton";
import { useSearchParams } from "next/navigation";
import { useGuidedTour, GuidedTourButton } from "../components/GuidedTour";
import WelcomePopup from "../components/WelcomePopup";
import AddEventChoiceModal from "../components/AddEventChoiceModal";
import PhotoUploadModal from "../components/PhotoUploadModal";
import VoiceRecordModal from "../components/VoiceRecordModal";
import BottomNav from "../components/BottomNav";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingSpinner, { ButtonSpinner } from "../components/LoadingSpinner";
import SwipeableCard from "../components/SwipeableCard";
import PullToRefresh from "../components/PullToRefresh";
import FAB from "../components/FAB";

// Bible verses - Family and Peace themed (ESV)
const BIBLE_VERSES = [
  // Family verses
  { text: "As for me and my house, we will serve the Lord.", reference: "Joshua 24:15" },
  { text: "Children are a heritage from the Lord, offspring a reward from him.", reference: "Psalm 127:3" },
  { text: "Train up a child in the way he should go; even when he is old he will not depart from it.", reference: "Proverbs 22:6" },
  { text: "Fathers, do not provoke your children to anger, but bring them up in the discipline and instruction of the Lord.", reference: "Ephesians 6:4" },
  { text: "Honor your father and your mother, that your days may be long in the land that the Lord your God is giving you.", reference: "Exodus 20:12" },
  { text: "Love is patient and kind; love does not envy or boast; it is not arrogant or rude.", reference: "1 Corinthians 13:4-5" },
  { text: "Above all, keep loving one another earnestly, since love covers a multitude of sins.", reference: "1 Peter 4:8" },
  { text: "And these words that I command you today shall be on your heart. You shall teach them diligently to your children.", reference: "Deuteronomy 6:6-7" },
  { text: "Behold, children are a heritage from the Lord, the fruit of the womb a reward.", reference: "Psalm 127:3" },
  { text: "May the Lord make you increase and abound in love for one another and for all.", reference: "1 Thessalonians 3:12" },

  // Peace verses
  { text: "Peace I leave with you; my peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled, neither let them be afraid.", reference: "John 14:27" },
  { text: "You keep him in perfect peace whose mind is stayed on you, because he trusts in you.", reference: "Isaiah 26:3" },
  { text: "And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.", reference: "Philippians 4:7" },
  { text: "Let the peace of Christ rule in your hearts, to which indeed you were called in one body. And be thankful.", reference: "Colossians 3:15" },
  { text: "The Lord gives strength to his people; the Lord blesses his people with peace.", reference: "Psalm 29:11" },
  { text: "For God is not a God of confusion but of peace.", reference: "1 Corinthians 14:33" },
  { text: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.", reference: "Philippians 4:6" },
  { text: "Cast your burden on the Lord, and he will sustain you; he will never permit the righteous to be moved.", reference: "Psalm 55:22" },
  { text: "Come to me, all who labor and are heavy laden, and I will give you rest.", reference: "Matthew 11:28" },
  { text: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.", reference: "Jeremiah 29:11" },
  { text: "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.", reference: "Psalm 23:1-3" },
  { text: "Be still, and know that I am God.", reference: "Psalm 46:10" },
];

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

// Helper function to get category icon
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
    "Other": "🎈"
  };
  return emojis[category] || "🎈";
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

function DashboardContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<{eventsFound: number; messagesScanned: number} | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isEnhancingEvent, setIsEnhancingEvent] = useState(false);
  const [showAddEventChoiceModal, setShowAddEventChoiceModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [addEventTab, setAddEventTab] = useState<"manual" | "paste" | "photo" | "voice">("manual");
  const [pastedText, setPastedText] = useState("");
  const [isExtractingEvent, setIsExtractingEvent] = useState(false);
  const [conversationalInput, setConversationalInput] = useState("");
  const [isParsingConversational, setIsParsingConversational] = useState(false);
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [showVoiceRecordModal, setShowVoiceRecordModal] = useState(false);
  const [showSearchEmailsModal, setShowSearchEmailsModal] = useState(false);
  const [emailSearchQuery, setEmailSearchQuery] = useState("");
  const [emailSearchTimeframe, setEmailSearchTimeframe] = useState("3"); // months
  const [isSearchingEmails, setIsSearchingEmails] = useState(false);
  const [emailSearchProgress, setEmailSearchProgress] = useState({ current: 0, total: 0 });
  const [emailSearchResults, setEmailSearchResults] = useState<any[]>([]);
  const [showActionsModal, setShowActionsModal] = useState(false);
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
  const [dailyVerse, setDailyVerse] = useState(() => {
    // Select a random verse on component mount
    return BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)];
  });

  // New state for UX improvements
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
    itemCount?: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedEventBackup, setDeletedEventBackup] = useState<any>(null);

  const { user: clerkUser } = useUser();
  const { signOut} = useClerk();
  const { startTour, hasSeenTour } = useGuidedTour();

  // Mutations
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const createEvent = useMutation(api.events.createEvent);
  const createUnconfirmedEvent = useMutation(api.events.createUnconfirmedEvent);

  // Get user from Convex
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Get family data
  const family = useQuery(
    api.families.getFamilyById,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get Gmail accounts to check if any are connected
  const gmailAccounts = useQuery(
    api.gmailAccounts.getFamilyGmailAccounts,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get upcoming events
  const upcomingEvents = useQuery(
    api.events.getUpcomingEvents,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get unconfirmed events
  const unconfirmedEvents = useQuery(
    api.events.getUnconfirmedEvents,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get family members for the edit modal
  const familyMembers = useQuery(
    api.familyMembers.getFamilyMembers,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get all events to extract unique categories
  const allEvents = useQuery(
    api.events.getConfirmedEvents,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Extract unique categories from existing events
  const existingCategories = React.useMemo(() => {
    if (!allEvents) return [];
    const categories = new Set<string>();
    allEvents.forEach((event: any) => {
      if (event.category) categories.add(event.category);
    });
    return Array.from(categories).sort();
  }, [allEvents]);

  // Filter upcoming events for action items only
  const actionRequiredEvents = React.useMemo(() => {
    if (!upcomingEvents) return undefined;

    // Combine upcoming events and unconfirmed events
    const allEventsToCheck = upcomingEvents || [];
    const unconfirmedToCheck = unconfirmedEvents || [];

    // Create a set of IDs to avoid duplicates
    const seenIds = new Set();
    const combinedEvents: any[] = [];

    // Filter for events that need attention:
    // 1. Events with action required that hasn't been completed
    // 2. Events with upcoming action deadlines (within 3 days)
    // 3. Unconfirmed events (need review)
    const today = new Date().toISOString().split("T")[0];
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Check all upcoming events for actions
    allEventsToCheck.forEach((event: any) => {
      if (seenIds.has(event._id)) return;

      // Show events with uncompleted actions
      if (event.requiresAction && !event.actionCompleted) {
        combinedEvents.push(event);
        seenIds.add(event._id);
        return;
      }

      // Show events with action deadlines coming up soon (within 3 days)
      if (event.actionDeadline && event.actionDeadline <= threeDaysFromNow && !event.actionCompleted) {
        combinedEvents.push(event);
        seenIds.add(event._id);
        return;
      }
    });

    // Add unconfirmed events (they need review - that's an action!)
    unconfirmedToCheck.forEach((event: any) => {
      if (!seenIds.has(event._id) && !event.isConfirmed) {
        combinedEvents.push(event);
        seenIds.add(event._id);
      }
    });

    // Sort by date
    return combinedEvents.sort((a: any, b: any) => {
      return a.eventDate.localeCompare(b.eventDate);
    });
  }, [upcomingEvents, unconfirmedEvents]);

  // Filter events based on search query
  const filteredActionEvents = React.useMemo(() => {
    if (!actionRequiredEvents) return undefined;
    if (!searchQuery.trim()) return actionRequiredEvents;

    const query = searchQuery.toLowerCase();
    return actionRequiredEvents.filter((event: any) => {
      return (
        event.title?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.childName?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.category?.toLowerCase().includes(query)
      );
    });
  }, [actionRequiredEvents, searchQuery]);

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
    "Other"
  ];

  // Get all events for this week and today
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const weekEvents = useQuery(
    api.events.getEventsByDateRange,
    convexUser?.familyId
      ? { familyId: convexUser.familyId, startDate: today, endDate: weekFromNow }
      : "skip"
  );

  const todayEvents = useQuery(
    api.events.getEventsByDateRange,
    convexUser?.familyId
      ? { familyId: convexUser.familyId, startDate: today, endDate: today }
      : "skip"
  );

  const tomorrowEvents = useQuery(
    api.events.getEventsByDateRange,
    convexUser?.familyId
      ? { familyId: convexUser.familyId, startDate: tomorrow, endDate: tomorrow }
      : "skip"
  );

  const isGmailConnected = (gmailAccounts?.length ?? 0) > 0;

  // Check for onboarding completion
  useEffect(() => {
    const onboardingComplete = searchParams.get("onboarding_complete");
    if (onboardingComplete === "true") {
      setShowWelcomeGuide(true);
      // Clear the query params
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

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

      // Press 'N' to create new event
      if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setShowAddEventModal(true);
        showToast("Keyboard shortcut: 'N' - New event", "info", undefined, 2000);
      }

      // Press 'Escape' to close modals
      if (event.key === 'Escape') {
        if (showConfirmDialog) {
          setShowConfirmDialog(false);
        } else if (showAddEventModal) {
          setShowAddEventModal(false);
        } else if (showPhotoUploadModal) {
          setShowPhotoUploadModal(false);
        } else if (showVoiceRecordModal) {
          setShowVoiceRecordModal(false);
        } else if (showAddEventChoiceModal) {
          setShowAddEventChoiceModal(false);
        } else if (showSearchEmailsModal) {
          setShowSearchEmailsModal(false);
        } else if (showActionsModal) {
          setShowActionsModal(false);
        } else if (selectedEvent) {
          setSelectedEvent(null);
          setIsEditingEvent(false);
          setEditFormData(null);
        } else if (showScanModal) {
          setShowScanModal(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddEventModal, selectedEvent, showScanModal, showPhotoUploadModal, showVoiceRecordModal, showAddEventChoiceModal, showSearchEmailsModal, showActionsModal, showConfirmDialog, showToast]);

  const handleScanEmail = async () => {
    if (!gmailAccounts || gmailAccounts.length === 0) {
      showToast("Please connect a Gmail account first", "warning");
      return;
    }

    setIsScanning(true);
    setShowScanModal(true);
    setScanProgress(0);
    setScanResults(null);
    setScanMessage("Connecting to Gmail...");

    // Simulate progress updates with phase-based messages
    let currentProgress = 0;
    let phase = 0;
    const phases = [
      { message: "Connecting to Gmail...", maxProgress: 15 },
      { message: "Searching for event-related emails...", maxProgress: 35 },
      { message: "Analyzing email content...", maxProgress: 65 },
      { message: "Extracting event details...", maxProgress: 85 },
      { message: "Finalizing results...", maxProgress: 95 },
    ];

    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 2.5;

      // Update phase based on progress
      if (currentProgress >= phases[phase].maxProgress && phase < phases.length - 1) {
        phase++;
        setScanMessage(phases[phase].message);
      }

      // Cap at current phase max
      const cappedProgress = Math.min(currentProgress, phases[phase].maxProgress);
      setScanProgress(cappedProgress);
    }, 600);

    try {
      const response = await fetch("/api/scan-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: gmailAccounts[0]._id,
        }),
      });

      const data = await response.json();
      clearInterval(progressInterval);

      if (response.ok) {
        setScanProgress(100);
        setScanResults({
          eventsFound: data.eventsFound || 0,
          messagesScanned: data.messagesScanned || 0,
        });
        setScanMessage(
          data.eventsFound > 0
            ? `✓ Found ${data.eventsFound} event${data.eventsFound !== 1 ? "s" : ""} from ${data.messagesScanned} email${data.messagesScanned !== 1 ? "s" : ""}!`
            : `Scanned ${data.messagesScanned} emails, but didn't find any new events.`
        );
      } else {
        setScanMessage(`Error: ${data.error || "Failed to scan emails"}`);
        showToast(data.error || "Failed to scan emails", "error");
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Scan error:", error);
      setScanMessage("Failed to scan emails. Please try again.");
      showToast("Failed to scan emails. Please try again.", "error");
    } finally {
      setIsScanning(false);
    }
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

  const handlePhotoUpload = async (file: File) => {
    if (!convexUser?.familyId) {
      showToast("Session expired. Please refresh the page and try again.", "error");
      setShowPhotoUploadModal(false);
      return;
    }

    try {
      // Create FormData to send the file
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
      if (data.events.length > 1) {
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
        setShowPhotoUploadModal(false);
        showToast(`✓ Found ${data.events.length} events from photo! Go to Review page to approve them.`, "success", undefined, 7000);
      } else {
        // Single event - populate the form for immediate review/editing
        const event = data.events[0];
        setNewEventForm({
          title: event.title || "",
          eventDate: event.date || "",
          eventTime: event.time || "",
          endTime: event.endTime || "",
          location: event.location || "",
          category: categoryMap[event.category] || "Other",
          childName: "",
          description: event.description || "",
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

        // Close photo modal and open the add event modal with the form populated
        setShowPhotoUploadModal(false);
        setShowAddEventModal(true);
        setAddEventTab("manual");
        showToast(`✓ Event extracted from photo! Review and save below.`, "success", undefined, 5000);
      }
    } catch (error: any) {
      console.error("Error extracting event from photo:", error);
      showToast("Failed to extract event from photo. Please try again or enter manually.", "error");
    }
  };

  const handleVoiceRecording = async (audioBlob: Blob) => {
    if (!convexUser?.familyId) {
      showToast("Session expired. Please refresh the page and try again.", "error");
      setShowVoiceRecordModal(false);
      return;
    }

    try {
      // Create FormData to send the audio file
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
      if (data.events.length > 1) {
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
        setShowVoiceRecordModal(false);
        showToast(`✓ Found ${data.events.length} events from your recording! Go to Review page to approve them.`, "success", undefined, 7000);
      } else {
        // Single event - populate the form for immediate review/editing
        const event = data.events[0];
        setNewEventForm({
          title: event.title || "",
          eventDate: event.date || "",
          eventTime: event.time || "",
          endTime: event.endTime || "",
          location: event.location || "",
          category: categoryMap[event.category] || "Other",
          childName: "",
          description: event.description || "",
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

        // Close voice modal and open the add event modal with the form populated
        setShowVoiceRecordModal(false);
        setShowAddEventModal(true);
        setAddEventTab("manual");
        showToast(`✓ Event extracted from recording! Review and save below.`, "success", undefined, 5000);
      }
    } catch (error: any) {
      console.error("Error extracting event from voice:", error);
      showToast("Failed to extract event from recording. Please try again or enter manually.", "error");
    }
  };

  // Handle conversational input parsing
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

  // Handle FAB actions
  const handleFABAction = (action: "manual" | "paste" | "photo" | "voice") => {
    switch (action) {
      case "manual":
        setShowAddEventModal(true);
        break;
      case "paste":
        // For now, open the manual modal - we can add paste modal later
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
      showToast("Unable to create event. Please try again.", "error");
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-accent-600">
            Our Daily Family
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-accent-600 font-medium"
            >
              Home
            </Link>
            <Link
              id="calendar-link"
              href="/calendar"
              className="text-gray-600 hover:text-gray-900"
            >
              Calendar
            </Link>
            <Link
              id="review-link"
              href="/review"
              className="text-gray-600 hover:text-gray-900"
            >
              Events
            </Link>
            <Link
              href="/discover"
              className="text-gray-600 hover:text-gray-900"
            >
              Find Activities
            </Link>
            <Link
              href="/settings"
              className="text-gray-600 hover:text-gray-900"
            >
              Settings
            </Link>
            <button
              onClick={() => signOut()}
              className="text-gray-600 hover:text-gray-900"
            >
              Log Out
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-2xl text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Navigation Menu - Overlay */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-out Menu */}
            <div className="md:hidden fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-strong transform transition-transform duration-300 ease-in-out">
              {/* Menu Header */}
              <div className="p-6 border-b border-gray-200 bg-primary-600">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Menu</h2>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    aria-label="Close menu"
                    title="Close"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white font-bold text-lg">
                      {clerkUser?.firstName?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {clerkUser?.firstName || "User"}
                    </p>
                    <p className="text-white/80 text-xs truncate">
                      {clerkUser?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="flex flex-col p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-primary-600 font-medium bg-primary-50 rounded-lg mb-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Home
                </Link>
                <Link
                  href="/calendar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Calendar
                </Link>
                <Link
                  href="/review"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Review
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  You
                </Link>

                <div className="border-t border-gray-200 my-4"></div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log Out
                </button>
              </nav>
            </div>
          </>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Popup - Shows after onboarding */}
        {showWelcomeGuide && (
          <WelcomePopup
            onClose={() => {
              setShowWelcomeGuide(false);
              // Clear the URL parameter
              window.history.replaceState({}, "", "/dashboard");
            }}
            userFirstName={clerkUser?.firstName || undefined}
          />
        )}

        {/* Personalized Greeting with Family Branding - Desktop Only */}
        <div className="hidden lg:block mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-3xl">🏠</span>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                {clerkUser && (() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
                  const firstName = clerkUser.firstName || clerkUser.fullName?.split(' ')[0] || "there";
                  const lastName = clerkUser.lastName || clerkUser.fullName?.split(' ')[1] || "";
                  return `${greeting}, ${firstName}${lastName ? ' ' + lastName : ''}!`;
                })()}
              </h1>
              {family?.name && (
                <p className="text-lg text-primary-600 font-semibold mt-1">
                  {family.name} Family Hub
                </p>
              )}
            </div>
          </div>
          <p className="text-gray-600 text-lg">
            Never miss a practice, forget an RSVP, or lose track of what's happening this week
          </p>
        </div>

        {/* Gmail Connection Banner */}
        {!isGmailConnected && (
          <div className="bg-primary-50 border-l-4 border-primary-400 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Connect Gmail to automatically find events in your inbox
                </p>
              </div>
              <Link
                href="/settings"
                className="inline-block bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition whitespace-nowrap"
              >
                Connect
              </Link>
            </div>
          </div>
        )}

        {/* Stats Cards - Desktop Only */}
        <div className="hidden lg:grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* This Week Card */}
          <Link
            href="/calendar"
            className="bg-primary-600 rounded-xl shadow-md p-6 text-white hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">7 days</span>
            </div>
            <h3 className="text-white font-semibold mb-2 text-base">📅 Your Week Ahead</h3>
            <div className="mb-2">
              {weekEvents === undefined ? (
                <span className="inline-block w-12 h-10 bg-white/20 rounded animate-pulse"></span>
              ) : (
                <>
                  <span className="text-4xl font-bold">{weekEvents.length}</span>
                  <span className="text-lg font-semibold ml-2 text-white/90">
                    {weekEvents.length === 1 ? 'event' : 'events'}
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-white/90 mb-3">See what's coming up and when everyone needs to be where</p>
            <p className="text-sm text-white/80 font-medium">View Full Calendar →</p>
          </Link>

          {/* Needs Action Card */}
          <div
            onClick={() => setShowActionsModal(true)}
            className="bg-amber-500 rounded-xl shadow-md p-6 text-white hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Urgent</span>
            </div>
            <h3 className="text-white font-semibold mb-2 text-base">⚡ Action Needed</h3>
            <div className="mb-2">
              {weekEvents === undefined ? (
                <span className="inline-block w-12 h-10 bg-white/20 rounded animate-pulse"></span>
              ) : (() => {
                  // Filter for upcoming actions only (within next 2 weeks)
                  const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  const count = weekEvents.filter((e) => {
                    if (!e.requiresAction || e.actionCompleted) return false;
                    // Check if action deadline or event date is in the future
                    const relevantDate = e.actionDeadline || e.eventDate;
                    return relevantDate >= today && relevantDate <= twoWeeksFromNow;
                  }).length;
                  return (
                    <>
                      <span className="text-4xl font-bold">{count}</span>
                      <span className="text-lg font-semibold ml-2 text-white/90">
                        {count === 1 ? 'RSVP' : 'RSVPs'}
                      </span>
                    </>
                  );
                })()
              }
            </div>
            <p className="text-sm text-white/90 mb-3">Deadlines coming up! Sign-up sheets, permission slips, and payments</p>
            <p className="text-sm text-white/80 font-medium">Handle These →</p>
          </div>

          {/* To Review Card */}
          <Link
            href="/review"
            className="bg-teal-500 rounded-xl shadow-md p-6 text-white hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              {unconfirmedEvents && unconfirmedEvents.length > 0 && (
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full animate-pulse">New!</span>
              )}
            </div>
            <h3 className="text-white font-semibold mb-2 text-base">✨ New Events Found</h3>
            <div className="mb-2">
              {unconfirmedEvents === undefined ? (
                <span className="inline-block w-12 h-10 bg-white/20 rounded animate-pulse"></span>
              ) : (
                <>
                  <span className="text-4xl font-bold">{unconfirmedEvents.length}</span>
                  <span className="text-lg font-semibold ml-2 text-white/90">
                    {unconfirmedEvents.length === 1 ? 'event' : 'events'}
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-white/90 mb-3">We found these in your emails - quick review to add to your calendar</p>
            <p className="text-sm text-white/80 font-medium">Review & Add →</p>
          </Link>
        </div>

        {/* Today's Events - Prominent Section - Desktop Only */}
        {todayEvents && todayEvents.length > 0 && (
          <div className="hidden lg:block bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 mb-8 border-2 border-primary-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Today's Events</h2>
                  <p className="text-sm text-gray-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <span className="text-3xl font-bold text-primary-600">{todayEvents.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayEvents.map((event) => (
                <div
                  key={event._id}
                  onClick={() => setSelectedEvent(event)}
                  className="bg-white rounded-lg p-4 shadow-soft hover:shadow-medium transition-all cursor-pointer border-l-4"
                  style={{ borderLeftColor: event.category ? getCategoryColor(event.category) : '#3b82f6' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {event.title}
                    </h3>
                    {event.eventTime && (
                      <span className="text-sm font-bold text-primary-600">{formatTime12Hour(event.eventTime)}</span>
                    )}
                  </div>
                  {event.location && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.location}
                    </p>
                  )}
                  {event.childName && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-800 mt-2">
                      {event.childName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile-First Layout */}
        <div className="block lg:hidden">
          <PullToRefresh onRefresh={async () => {
            // Trigger a refetch of events
            await new Promise(resolve => setTimeout(resolve, 1000));
            window.location.reload(); // Simple reload for now
          }}>
            {/* Main Content - Mobile First */}
            <div className="flex-1">
              <div className="max-w-2xl mx-auto">

                {/* Welcome Header */}
                <div className="mb-6 bg-primary-600 rounded-3xl p-6 text-white shadow-md">
                  <h1 className="text-2xl font-bold mb-2">{family?.name || "Your"} Family Hub</h1>
                  <p className="text-primary-50 text-sm leading-relaxed">
                    Add events, discover activities, and keep your family's schedule organized—all in one place
                  </p>
                </div>

                {/* Quick AI - First Section */}
                <div className="mb-8">
                <div className="bg-blue-50 rounded-3xl p-6 shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-sm">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Quick Add</h2>
                      <p className="text-sm text-gray-600">Just type naturally—we'll handle the rest</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={conversationalInput}
                      onChange={(e) => setConversationalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && conversationalInput.trim() && !isParsingConversational) {
                          handleParseConversational();
                        }
                      }}
                      placeholder="'Soccer practice Tuesday 4pm at Lincoln Field'"
                      className="flex-1 px-5 py-4 border-2 border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-base placeholder:text-gray-400 bg-white shadow-sm"
                      disabled={isParsingConversational}
                    />
                    <button
                      onClick={handleParseConversational}
                      disabled={!conversationalInput.trim() || isParsingConversational}
                      className="px-6 py-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isParsingConversational ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="hidden sm:inline">Adding...</span>
                        </>
                      ) : (
                        <>
                          <span>Add</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Type naturally and click Add</span>
                  </div>
                </div>
                </div>

              {/* Log an Event - Second Section */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Log an Event</h2>
                <p className="text-sm text-gray-600 mb-4">Quick ways to add events manually</p>

                <div className="grid grid-cols-2 gap-3">
                  {/* Snap Photo of Flyer */}
                  <button
                    onClick={() => setShowPhotoUploadModal(true)}
                    className="bg-primary-500 rounded-2xl p-4 shadow-md hover:shadow-lg active:scale-95 transition-all text-white text-left"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="font-bold text-base">Snap Photo</div>
                    <div className="text-xs opacity-90 mt-1">Flyer or schedule</div>
                  </button>

                  {/* Voice Record */}
                  <button
                    onClick={() => setShowVoiceRecordModal(true)}
                    className="bg-rose-500 rounded-2xl p-4 shadow-md hover:shadow-lg active:scale-95 transition-all text-white text-left"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div className="font-bold text-base">Voice</div>
                    <div className="text-xs opacity-90 mt-1">Say it out loud</div>
                  </button>

                  {/* Paste Text */}
                  <button
                    onClick={() => {
                      setShowAddEventModal(true);
                      setAddEventTab("paste");
                    }}
                    className="bg-teal-500 rounded-2xl p-4 shadow-md hover:shadow-lg active:scale-95 transition-all text-white text-left"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="font-bold text-base">Paste Text</div>
                    <div className="text-xs opacity-90 mt-1">Copy & paste</div>
                  </button>

                  {/* Manual Entry */}
                  <button
                    onClick={() => setShowAddEventModal(true)}
                    className="bg-slate-600 rounded-2xl p-4 shadow-md hover:shadow-lg active:scale-95 transition-all text-white text-left"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="font-bold text-base">Type it in</div>
                    <div className="text-xs opacity-90 mt-1">Manual entry</div>
                  </button>
                </div>
              </div>

              {/* Find an Event - Third Section */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Find an Event</h2>
                <p className="text-sm text-gray-600 mb-4">Search emails or discover local activities</p>

                <div className="grid grid-cols-1 gap-3">
                  {/* Search Email */}
                  {gmailAccounts && gmailAccounts.length > 0 && (
                    <Link
                      href="/review"
                      className="bg-amber-500 rounded-2xl p-4 shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-white flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-bold text-lg">Search Email</div>
                        <div className="text-sm opacity-90 mt-0.5">Find specific events in your inbox</div>
                      </div>
                      <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}

                  {/* Explore Local Activities */}
                  <Link
                    href="/discover"
                    className="bg-purple-500 rounded-2xl p-4 shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-white flex items-center gap-3"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-lg">Explore Activities</div>
                      <div className="text-sm opacity-90 mt-0.5">Discover events happening near you</div>
                    </div>
                    <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
            </div>
          </PullToRefresh>
        </div>

        {/* Desktop View - Keep existing layout */}
        <div className="hidden lg:block">
          {/* Original desktop layout below */}
          <div className="flex-1">
            <div className="max-w-7xl mx-auto">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-base"
                  />
                  <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Today's Events */}
              {todayEvents && todayEvents.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>Today</span>
                    <span className="text-sm font-normal text-gray-500">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </h2>

                  <div className="space-y-4">
                    {todayEvents.map((event: any, index: number) => (
                      <SwipeableCard
                        key={event._id}
                        onSwipeLeft={() => {
                          setConfirmDialogConfig({
                            title: "Delete Event",
                            message: `Are you sure you want to delete "${event.title}"?`,
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
                            variant: "danger"
                          });
                          setShowConfirmDialog(true);
                        }}
                        onSwipeRight={async () => {
                          if (event.requiresAction && !event.actionCompleted) {
                            try {
                              await updateEvent({
                                eventId: event._id,
                                actionCompleted: true,
                              });
                              showToast('Action marked as complete! 🎉', 'success');
                            } catch (error) {
                              console.error('Error updating event:', error);
                              showToast('Unable to update event. Please try again.', 'error');
                            }
                          }
                        }}
                        rightAction={event.requiresAction && !event.actionCompleted ? {
                          label: "Complete",
                          icon: <span>✓</span>,
                          color: "#10b981"
                        } : undefined}
                      >
                      <div
                        onClick={() => setSelectedEvent(event)}
                        className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border-2 border-gray-100 hover:border-primary-200 cursor-pointer"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Action Required Banner */}
                        {!event.isConfirmed && (
                          <div className="mb-3 px-3 py-2 bg-amber-50 border-l-4 border-amber-500 rounded">
                            <p className="text-sm font-semibold text-amber-900">Needs Review</p>
                          </div>
                        )}
                        {event.requiresAction && !event.actionCompleted && (
                          <div className="mb-3 px-3 py-2 bg-red-50 border-l-4 border-red-500 rounded">
                            <p className="text-sm font-semibold text-red-900">Action Required</p>
                            {event.actionDescription && (
                              <p className="text-xs text-red-800 mt-1">{event.actionDescription}</p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-4">
                          {/* Category Emoji Icon */}
                          <div className="flex-shrink-0">
                            <div
                              className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-sm"
                              style={{
                                backgroundColor: event.category ? `${getCategoryColor(event.category)}15` : '#f3f4f615',
                                borderLeft: `4px solid ${getCategoryColor(event.category)}`,
                              }}
                            >
                              {getCategoryEmoji(event.category)}
                            </div>
                          </div>

                          {/* Event Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-xl mb-3 leading-tight">{event.title}</h3>

                            <div className="space-y-2 mb-4">
                              {event.eventTime && (
                                <div className="flex items-center gap-2.5 text-gray-700">
                                  <span className="text-xl">🕐</span>
                                  <span className="font-semibold text-lg">{formatTime12Hour(event.eventTime)}</span>
                                </div>
                              )}
                              {event.location && (
                                <div className="flex items-center gap-2.5 text-gray-700">
                                  <span className="text-xl">📍</span>
                                  <span className="truncate text-base">{event.location}</span>
                                </div>
                              )}
                            </div>

                            {/* Tags Row */}
                            {event.childName && (
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const names = event.childName.split(",").map((n: string) => n.trim());
                                  return names.map((name: string, idx: number) => {
                                    const member = familyMembers?.find((m: any) => m.name === name);
                                    const color = member?.color || "#6366f1";
                                    return (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center px-3.5 py-2 rounded-full text-sm font-semibold text-white shadow-soft"
                                        style={{ backgroundColor: color }}
                                      >
                                        {name}
                                      </span>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      </SwipeableCard>
                    ))}
                  </div>
                </div>
              )}

              {/* Tomorrow's Events Preview */}
              {tomorrowEvents && tomorrowEvents.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>Tomorrow</span>
                    <span className="text-sm font-normal text-gray-500">
                      {new Date(Date.now() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </h2>

                  <div className="space-y-4">
                    {tomorrowEvents.map((event: any, index: number) => (
                      <SwipeableCard
                        key={event._id}
                        onSwipeLeft={() => {
                          setConfirmDialogConfig({
                            title: "Delete Event",
                            message: `Are you sure you want to delete "${event.title}"?`,
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
                            variant: "danger"
                          });
                          setShowConfirmDialog(true);
                        }}
                        onSwipeRight={async () => {
                          if (event.requiresAction && !event.actionCompleted) {
                            try {
                              await updateEvent({
                                eventId: event._id,
                                actionCompleted: true,
                              });
                              showToast('Action marked as complete! 🎉', 'success');
                            } catch (error) {
                              console.error('Error updating event:', error);
                              showToast('Unable to update event. Please try again.', 'error');
                            }
                          }
                        }}
                        rightAction={event.requiresAction && !event.actionCompleted ? {
                          label: "Complete",
                          icon: <span>✓</span>,
                          color: "#10b981"
                        } : undefined}
                      >
                      <div
                        onClick={() => setSelectedEvent(event)}
                        className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border-2 border-gray-100 hover:border-primary-200 cursor-pointer"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Action Required Banner */}
                        {!event.isConfirmed && (
                          <div className="mb-3 px-3 py-2 bg-amber-50 border-l-4 border-amber-500 rounded">
                            <p className="text-sm font-semibold text-amber-900">Needs Review</p>
                          </div>
                        )}
                        {event.requiresAction && !event.actionCompleted && (
                          <div className="mb-3 px-3 py-2 bg-red-50 border-l-4 border-red-500 rounded">
                            <p className="text-sm font-semibold text-red-900">Action Required</p>
                            {event.actionDescription && (
                              <p className="text-xs text-red-800 mt-1">{event.actionDescription}</p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-4">
                          {/* Category Emoji Icon */}
                          <div className="flex-shrink-0">
                            <div
                              className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-sm"
                              style={{
                                backgroundColor: event.category ? `${getCategoryColor(event.category)}15` : '#f3f4f615',
                                borderLeft: `4px solid ${getCategoryColor(event.category)}`,
                              }}
                            >
                              {getCategoryEmoji(event.category)}
                            </div>
                          </div>

                          {/* Event Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-xl mb-3 leading-tight">{event.title}</h3>

                            <div className="space-y-2 mb-4">
                              {event.eventTime && (
                                <div className="flex items-center gap-2.5 text-gray-700">
                                  <span className="text-xl">🕐</span>
                                  <span className="font-semibold text-lg">{formatTime12Hour(event.eventTime)}</span>
                                </div>
                              )}
                              {event.location && (
                                <div className="flex items-center gap-2.5 text-gray-700">
                                  <span className="text-xl">📍</span>
                                  <span className="truncate text-base">{event.location}</span>
                                </div>
                              )}
                            </div>

                            {/* Tags Row */}
                            {event.childName && (
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const names = event.childName.split(",").map((n: string) => n.trim());
                                  return names.map((name: string, idx: number) => {
                                    const member = familyMembers?.find((m: any) => m.name === name);
                                    const color = member?.color || "#6366f1";
                                    return (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center px-3.5 py-2 rounded-full text-sm font-semibold text-white shadow-soft"
                                        style={{ backgroundColor: color }}
                                      >
                                        {name}
                                      </span>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      </SwipeableCard>
                    ))}
                  </div>
                </div>
              )}

              {/* This Week - Remaining events */}
              {weekEvents && weekEvents.filter((e: any) => e.eventDate > tomorrow).length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">This Week</h2>

                  {groupEventsByDate(weekEvents.filter((e: any) => e.eventDate > tomorrow)).map(({ date, events }) => (
                    <div key={date} className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span>{formatMomFriendlyDate(date)}</span>
                      </h3>
                      <div className="space-y-4">
                        {events.map((event: any, index: number) => (
                          <SwipeableCard
                            key={event._id}
                            onSwipeLeft={() => {
                              setConfirmDialogConfig({
                                title: "Delete Event",
                                message: `Are you sure you want to delete "${event.title}"?`,
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
                                variant: "danger"
                              });
                              setShowConfirmDialog(true);
                            }}
                            onSwipeRight={async () => {
                              if (event.requiresAction && !event.actionCompleted) {
                                try {
                                  await updateEvent({
                                    eventId: event._id,
                                    actionCompleted: true,
                                  });
                                  showToast('Action marked as complete! 🎉', 'success');
                                } catch (error) {
                                  console.error('Error updating event:', error);
                                  showToast('Unable to update event. Please try again.', 'error');
                                }
                              }
                            }}
                            rightAction={event.requiresAction && !event.actionCompleted ? {
                          label: "Complete",
                          icon: <span>✓</span>,
                          color: "#10b981"
                        } : undefined}
                          >
                          <div
                            onClick={() => setSelectedEvent(event)}
                            className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border-2 border-gray-100 hover:border-primary-200 cursor-pointer"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            {/* Action Required Banner */}
                            {!event.isConfirmed && (
                              <div className="mb-3 px-3 py-2 bg-amber-50 border-l-4 border-amber-500 rounded">
                                <p className="text-sm font-semibold text-amber-900">Needs Review</p>
                              </div>
                            )}
                            {event.requiresAction && !event.actionCompleted && (
                              <div className="mb-3 px-3 py-2 bg-red-50 border-l-4 border-red-500 rounded">
                                <p className="text-sm font-semibold text-red-900">Action Required</p>
                                {event.actionDescription && (
                                  <p className="text-xs text-red-800 mt-1">{event.actionDescription}</p>
                                )}
                              </div>
                            )}

                            <div className="flex gap-4">
                              {/* Category Emoji Icon */}
                              <div className="flex-shrink-0">
                                <div
                                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-sm"
                                  style={{
                                    backgroundColor: event.category ? `${getCategoryColor(event.category)}15` : '#f3f4f615',
                                    borderLeft: `4px solid ${getCategoryColor(event.category)}`,
                                  }}
                                >
                                  {getCategoryEmoji(event.category)}
                                </div>
                              </div>

                              {/* Event Details */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-xl mb-3 leading-tight">{event.title}</h3>

                                <div className="space-y-2 mb-4">
                              {event.eventTime && (
                                <div className="flex items-center gap-2.5 text-gray-700">
                                  <span className="text-xl">🕐</span>
                                  <span className="font-semibold text-lg">{formatTime12Hour(event.eventTime)}</span>
                                </div>
                              )}
                              {event.location && (
                                <div className="flex items-center gap-2.5 text-gray-700">
                                  <span className="text-xl">📍</span>
                                  <span className="truncate text-base">{event.location}</span>
                                </div>
                              )}
                            </div>

                            {/* Tags Row */}
                            {event.childName && (
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const names = event.childName.split(",").map((n: string) => n.trim());
                                  return names.map((name: string, idx: number) => {
                                    const member = familyMembers?.find((m: any) => m.name === name);
                                    const color = member?.color || "#6366f1";
                                    return (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center px-3.5 py-2 rounded-full text-sm font-semibold text-white shadow-soft"
                                        style={{ backgroundColor: color }}
                                      >
                                        {name}
                                      </span>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                              </div>
                            </div>
                          </div>
                          </SwipeableCard>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {(!todayEvents || todayEvents.length === 0) &&
               (!tomorrowEvents || tomorrowEvents.length === 0) &&
               (!weekEvents || weekEvents.filter((e: any) => e.eventDate > tomorrow).length === 0) && (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-200 to-green-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">All clear this week!</h3>
                  <p className="text-gray-600 mb-6">No events scheduled. Tap the + button to add one.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout - Original Two Column */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Events */}
          <div id="upcoming-events" className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">⚡</span>
                      Action Dashboard
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Events requiring your attention this week</p>
                  </div>
                  <Link
                    href="/calendar"
                    className="text-accent-600 hover:text-accent-700 font-medium text-sm flex items-center gap-1"
                  >
                    View Calendar
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                {/* Search Bar and Select All */}
                <div className="flex gap-3 items-center">
                  {filteredActionEvents && filteredActionEvents.length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={filteredActionEvents.every((e: any) => selectedEventIds.has(e._id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allIds = new Set(filteredActionEvents.map((event: any) => event._id));
                            setSelectedEventIds(allIds);
                          } else {
                            setSelectedEventIds(new Set());
                          }
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Select All</span>
                    </label>
                  )}

                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search events by title, location, child, or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm min-h-[44px] sm:min-h-[40px]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedEventIds.size > 0 && (
                  <div className="mt-3 bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {selectedEventIds.size} event{selectedEventIds.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
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

                                // Backup all events for undo
                                const eventsToDelete = filteredActionEvents?.filter((e: any) =>
                                  idsToDelete.includes(e._id)
                                );
                                const eventBackups = eventsToDelete?.map((e: any) => ({ ...e })) || [];

                                // Delete all selected events
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
              </div>
              <div className="divide-y divide-gray-200">
                {filteredActionEvents === undefined ? (
                  <>
                    <EventCardSkeleton />
                    <EventCardSkeleton />
                    <EventCardSkeleton />
                  </>
                ) : filteredActionEvents.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No events found</h3>
                    <p className="text-sm text-gray-600">
                      {searchQuery ? `No events match "${searchQuery}"` : "No action items this week"}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (actionRequiredEvents && actionRequiredEvents.length === 0) ? (
                  <div className="p-8 sm:p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-200 to-green-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">You're all caught up! ✨</h3>
                    <p className="text-gray-600 mb-6">No action items this week. Check the Calendar for your full schedule.</p>

                    <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                      <h4 className="font-semibold text-gray-900 mb-3">Getting started:</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Check your emails for schedules</p>
                            <p className="text-xs text-gray-600 mt-0.5">We'll look for sports, schools, and activities</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Type in an event</p>
                            <p className="text-xs text-gray-600 mt-0.5">Quick entry for any activity or appointment</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-accent-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Discover local activities</p>
                            <p className="text-xs text-gray-600 mt-0.5">Find new opportunities for your kids</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                      <p className="text-sm text-gray-700 text-center">
                        👉 Use the buttons on the right to add your first event!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 p-4">
                    {searchQuery && actionRequiredEvents && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-900">
                          Showing {filteredActionEvents.length} of {actionRequiredEvents.length} events
                        </p>
                      </div>
                    )}
                    {groupEventsByDate(filteredActionEvents).map(({ date, events }) => (
                      <div key={date}>
                        {/* Date Header - More playful */}
                        <div className="mb-3">
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-2xl">📅</span>
                            {formatMomFriendlyDate(date)}
                          </h3>
                        </div>
                        {/* Events for this day - Card style */}
                        <div className="space-y-4">
                          {events.map((event: any, index: number) => (
                            <SwipeableCard
                              key={event._id}
                              onSwipeLeft={async () => {
                                // Delete on swipe left
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
                                    showToast('Action marked as complete! 🎉', 'success');
                                  } catch (error) {
                                    console.error('Error updating event:', error);
                                    showToast('Unable to update event. Please try again.', 'error');
                                  }
                                }
                              }}
                              leftAction={{
                                label: 'Delete',
                                icon: (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                ),
                                color: '#ef4444',
                              }}
                              rightAction={
                                event.requiresAction && !event.actionCompleted
                                  ? {
                                      label: 'Complete',
                                      icon: (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ),
                                      color: '#10b981',
                                    }
                                  : undefined
                              }
                            >
                              <div
                                className={`bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border-2 cursor-pointer animate-scaleIn ${
                                  selectedEventIds.has(event._id)
                                    ? 'border-primary-500 bg-primary-50 scale-[0.98]'
                                    : 'border-gray-100 hover:border-primary-200 hover:scale-[1.01]'
                                }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                              <div className="flex gap-4">
                                {/* Checkbox for bulk selection */}
                                <div className="flex-shrink-0 flex items-start pt-1">
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
                                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    aria-label={`Select ${event.title}`}
                                  />
                                </div>

                                {/* Category Emoji Icon */}
                                <div className="flex-shrink-0">
                                  <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm cursor-pointer"
                                    style={{
                                      backgroundColor: event.category ? `${getCategoryColor(event.category)}15` : '#f3f4f615',
                                      borderLeft: `4px solid ${getCategoryColor(event.category)}`,
                                    }}
                                    onClick={() => setSelectedEvent(event)}
                                  >
                                    {getCategoryEmoji(event.category)}
                                  </div>
                                </div>

                                {/* Event Details */}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 text-xl mb-3 leading-tight">{event.title}</h3>

                                  {/* Action Required Banner */}
                                  {!event.isConfirmed ? (
                                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-soft animate-pulse-subtle">
                                      <div className="flex items-start gap-3">
                                        <span className="text-2xl flex-shrink-0">📋</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-bold text-blue-900 text-base mb-1.5">
                                            Needs Review
                                          </div>
                                          <div className="text-blue-800 text-sm leading-relaxed">
                                            This event was found in your emails and needs confirmation
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : event.requiresAction && !event.actionCompleted && (
                                    <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-300 rounded-xl shadow-soft animate-pulse-subtle">
                                      <div className="flex items-start gap-3">
                                        <span className="text-2xl flex-shrink-0 animate-bounce-subtle">⚠️</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-bold text-orange-900 text-base mb-1.5">
                                            Action Required
                                          </div>
                                          <div className="text-orange-800 text-sm leading-relaxed">
                                            {event.actionDescription || 'Action needed'}
                                          </div>
                                          {event.actionDeadline && (
                                            <div className="text-orange-700 text-xs mt-2 font-semibold flex items-center gap-1">
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              Due: {new Date(event.actionDeadline).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: new Date(event.actionDeadline).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-2 mb-4">
                                    {event.eventTime && (
                                      <div className="flex items-center gap-2.5 text-gray-700">
                                        <span className="text-xl">🕐</span>
                                        <span className="font-semibold text-base">{formatTime12Hour(event.eventTime)}</span>
                                      </div>
                                    )}
                                    {event.location && (
                                      <div className="flex items-center gap-2.5 text-gray-700">
                                        <span className="text-xl">📍</span>
                                        <span className="truncate text-base">{event.location}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Tags Row */}
                                  {event.childName && (
                                    <div className="flex flex-wrap gap-2">
                                      {(() => {
                                        const names = event.childName.split(",").map((n: string) => n.trim());
                                        return names.map((name: string, idx: number) => {
                                          const member = familyMembers?.find((m: any) => m.name === name);
                                          const color = member?.color || "#6366f1";
                                          return (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center px-3.5 py-2 rounded-full text-sm font-semibold text-white shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105"
                                              style={{ backgroundColor: color }}
                                            >
                                              {name}
                                            </span>
                                          );
                                        });
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            </SwipeableCard>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add Event Button - Progressive Disclosure */}
          <div className="lg:col-span-1">
            {/* Daily Bible Verse - Featured */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-strong p-8 mb-6 relative overflow-hidden">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
              </div>

              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <span className="text-3xl">📖</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Today's Verse</h3>
                    <p className="text-sm text-white/80">Your daily encouragement</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 mb-4">
                  <p className="text-white text-lg leading-relaxed mb-4 font-medium">
                    "{dailyVerse.text}"
                  </p>
                  <p className="text-white/90 font-bold text-base">
                    — {dailyVerse.reference}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>English Standard Version</span>
                  <span>✨ New verse each visit</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
              <button
                onClick={() => setShowAddEventChoiceModal(true)}
                className="w-full px-6 py-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-2xl transition-all duration-200 shadow-medium hover:shadow-strong transform hover:-translate-y-1 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-xl font-bold text-white mb-1">
                      Add an Event
                    </div>
                    <div className="text-sm text-white/90">
                      Let us help you
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-white/80 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow-soft p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Quick Links</h3>
              <Link
                href="/settings"
                className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 group-hover:bg-primary-100 rounded-lg flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      Settings
                    </div>
                    <div className="text-xs text-gray-600">
                      Manage preferences
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Email Scan Progress Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-strong max-w-md w-full p-8 transform transition-all">
            <div className="text-center">
              {isScanning ? (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Checking your emails for schedules...</h3>
                  <p className="text-gray-600 mb-2 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    This usually takes 2-3 minutes
                  </p>

                  {/* Current Activity */}
                  {gmailAccounts && gmailAccounts.length > 0 && (
                    <div className="mb-4 text-sm text-gray-600">
                      <p className="font-medium">Checking: {gmailAccounts[0].email}</p>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-400 to-primary-500 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{Math.round(scanProgress)}% complete</p>

                  {/* Intermediate Results */}
                  {scanResults && scanResults.eventsFound > 0 && (
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-green-800">
                        So far: Found {scanResults.eventsFound} possible event{scanResults.eventsFound !== 1 ? "s" : ""}! ✨
                      </p>
                    </div>
                  )}

                  {/* Info boxes */}
                  <div className="space-y-3">
                    <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-left">
                          <p className="text-xs text-primary-700">
                            We're looking through your recent emails for any schedules, events, or activities.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 text-left">
                        💡 <span className="font-medium">Tip:</span> You can close this and come back later! We'll keep working in the background.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {scanResults && scanResults.eventsFound > 0 ? (
                    <>
                      <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Scan Complete!</h3>
                      <p className="text-gray-600 mb-6">{scanMessage}</p>

                      <div className="bg-primary-50 rounded-lg p-4 mb-6 border border-primary-200">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <p className="text-3xl font-bold text-primary-500">{scanResults.eventsFound}</p>
                            <p className="text-sm text-gray-600 mt-1">Event{scanResults.eventsFound !== 1 ? "s" : ""} Found</p>
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-primary-500">{scanResults.messagesScanned}</p>
                            <p className="text-sm text-gray-600 mt-1">Email{scanResults.messagesScanned !== 1 ? "s" : ""} Scanned</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-primary-50 rounded-lg p-4 mb-6 border border-primary-200">
                        <div className="flex gap-3">
                          <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-left">
                            <h4 className="font-semibold text-primary-800 text-sm">What's next?</h4>
                            <p className="text-sm text-primary-700 mt-1">
                              Review the new events to confirm details and add them to your calendar.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowScanModal(false)}
                          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          Close
                        </button>
                        <Link
                          href="/review"
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-medium transition-colors text-center"
                          onClick={() => setShowScanModal(false)}
                        >
                          Events →
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">No New Events Found</h3>
                      <p className="text-gray-600 mb-6">{scanMessage}</p>

                      <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                        <p className="text-sm text-gray-600">
                          We scanned <span className="font-semibold">{scanResults?.messagesScanned || 0}</span> recent emails but didn't find any new activity-related events.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowScanModal(false)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Close
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => {
            setSelectedEvent(null);
            setIsEditingEvent(false);
            setEditFormData(null);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-strong my-4 md:my-8 max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isEditingEvent ? (
              <>
                {/* Edit Mode Header */}
                <div className="bg-gradient-to-r from-primary-400 to-primary-500 rounded-t-2xl p-6">
                  <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-white">Edit Event</h2>
                    <button
                      onClick={() => {
                        setIsEditingEvent(false);
                        setEditFormData(null);
                      }}
                      className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                      aria-label="Close edit event modal"
                      title="Close"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* View Mode Header with Gradient */}
                <div className="bg-gradient-to-r from-primary-400 to-primary-500 rounded-t-2xl p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-2xl font-bold text-white pr-8">{selectedEvent.title}</h2>
                    <button
                      onClick={() => {
                        setSelectedEvent(null);
                        setIsEditingEvent(false);
                        setEditFormData(null);
                      }}
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
                        📅 {new Date(selectedEvent.eventDate).toLocaleDateString('en-US', {
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
              </>
            )}

            {isEditingEvent ? (
              <>
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
                    <div className="space-y-2 p-3 border border-gray-300 rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                      {familyMembers && familyMembers.length > 0 ? (
                        [...familyMembers].sort((a, b) => a.name.localeCompare(b.name)).map((member) => {
                          const selectedMembers = editFormData?.childName ? editFormData.childName.split(", ") : [];
                          const isChecked = selectedMembers.includes(member.name);

                          return (
                            <label key={member._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let updatedMembers = [...selectedMembers];
                                  if (e.target.checked) {
                                    updatedMembers.push(member.name);
                                  } else {
                                    updatedMembers = updatedMembers.filter(m => m !== member.name);
                                  }
                                  setEditFormData({
                                    ...editFormData,
                                    childName: updatedMembers.join(", ")
                                  });
                                }}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                              />
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium text-white"
                                style={{ backgroundColor: member.color || "#6366f1" }}
                              >
                                {member.name}
                              </span>
                            </label>
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
                          actionDescription: e.target.checked ? editFormData?.actionDescription : "",
                          actionDeadline: e.target.checked ? editFormData?.actionDeadline : "",
                          actionCompleted: e.target.checked ? editFormData?.actionCompleted : false
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
                            showToast("Event updated in app, but Google Calendar sync failed", "info");
                          }
                        }

                        showToast(`✓ Event "${editFormData.title}" updated successfully!`, "success", undefined, 7000);
                        setSelectedEvent(null);
                        setIsEditingEvent(false);
                        setEditFormData(null);
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
                      setIsEditingEvent(false);
                      setEditFormData(null);
                    }}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              /* View Mode */
              <>
                {/* Content */}
                <div className="p-6">
                  {/* Description Section */}
                  {selectedEvent.description && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                        Description
                      </h3>
                      <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4">
                        {selectedEvent.description}
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
                        <div className="text-gray-900 font-medium flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getCategoryColor(selectedEvent.category) }}
                            title={selectedEvent.category}
                            aria-label={selectedEvent.category}
                          />
                          <span>{selectedEvent.category}</span>
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

                  {/* Action Required Section */}
                  {selectedEvent.requiresAction && (
                    <div className={`mb-6 border-l-4 rounded-lg p-4 ${
                      selectedEvent.actionCompleted
                        ? 'bg-primary-50 border-primary-400'
                        : 'bg-secondary-50 border-secondary-400'
                    }`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={async () => {
                            try {
                              const newCompletedState = !selectedEvent.actionCompleted;
                              await updateEvent({
                                eventId: selectedEvent._id,
                                actionCompleted: newCompletedState,
                              });

                              // Update the selectedEvent state so UI reflects the change immediately
                              setSelectedEvent({
                                ...selectedEvent,
                                actionCompleted: newCompletedState,
                              });

                              showToast(
                                selectedEvent.actionCompleted
                                  ? "Action marked as incomplete"
                                  : "✓ Action completed!",
                                "success"
                              );
                            } catch (error) {
                              console.error("Error updating action status:", error);
                              showToast("Failed to update action status", "error");
                            }
                          }}
                          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                            selectedEvent.actionCompleted
                              ? 'bg-primary-500 border-primary-500'
                              : 'bg-white border-orange-400 hover:border-orange-600'
                          }`}
                          title={selectedEvent.actionCompleted ? "Mark as incomplete" : "Mark as complete"}
                        >
                          {selectedEvent.actionCompleted && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1">
                          <h4 className={`text-sm font-semibold mb-1 ${
                            selectedEvent.actionCompleted ? 'text-primary-700 line-through' : 'text-secondary-700'
                          }`}>
                            {selectedEvent.actionCompleted ? '✓ ' : ''}
                            Action: {selectedEvent.actionDescription || 'Action required'}
                          </h4>
                          {selectedEvent.actionDeadline && (
                            <p className={`text-sm ${
                              selectedEvent.actionCompleted ? 'text-primary-600' : 'text-secondary-600'
                            }`}>
                              Deadline: {new Date(selectedEvent.actionDeadline).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          )}
                          {selectedEvent.actionCompleted && (
                            <p className="text-xs text-primary-500 mt-1 font-medium">
                              Completed
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

                  {/* Sync Status */}
                  {selectedEvent.googleCalendarEventId && (
                    <div className="mb-6 bg-primary-50 rounded-lg p-4 flex items-center gap-3">
                      <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-primary-700">
                        Synced to Google Calendar
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setConfirmDialogConfig({
                        title: 'Delete Event?',
                        message: `Are you sure you want to delete "${selectedEvent.title}"? This action cannot be undone.`,
                        variant: 'danger',
                        onConfirm: async () => {
                          try {
                            // Store event data for undo
                            const eventBackup = { ...selectedEvent };

                            // Delete from Google Calendar first if it was synced
                            if (selectedEvent.googleCalendarEventId) {
                              try {
                                await fetch("/api/delete-calendar-event", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ eventId: selectedEvent._id }),
                                });
                              } catch (error) {
                                console.error("Error deleting from Google Calendar:", error);
                                // Continue with deletion even if Google Calendar deletion fails
                              }
                            }

                            // Delete from Convex database
                            await deleteEvent({ eventId: selectedEvent._id });
                            setSelectedEvent(null);
                            setShowConfirmDialog(false);

                            // Show toast with undo option
                            showToast(
                              `Event "${selectedEvent.title}" deleted`,
                              "success",
                              async () => {
                                // Undo: recreate the event
                                try {
                                  await createEvent({
                                    familyId: eventBackup.familyId,
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
                                  });
                                  showToast("Event restored", "success");
                                } catch (error) {
                                  console.error("Error restoring event:", error);
                                  showToast("Unable to restore event. Please try adding it again manually.", "error");
                                }
                              },
                              10000
                            );
                          } catch (error) {
                            console.error("Error deleting event:", error);
                            showToast("Unable to delete event. Please check your internet connection and try again.", "error");
                            setShowConfirmDialog(false);
                          }
                        },
                      });
                      setShowConfirmDialog(true);
                    }}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition shadow-soft flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[40px]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                  <div className="flex-1" />
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
                      });
                      setIsEditingEvent(true);
                    }}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition shadow-soft flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Event Choice Modal */}
      {showAddEventChoiceModal && (
        <AddEventChoiceModal
          onClose={() => setShowAddEventChoiceModal(false)}
          onCheckEmails={handleScanEmail}
          onTypeManually={() => setShowAddEventModal(true)}
          onPasteText={() => {
            setAddEventTab("paste");
            setShowAddEventModal(true);
          }}
          onUploadPhoto={() => {
            setShowPhotoUploadModal(true);
          }}
          onVoiceRecord={() => {
            setShowVoiceRecordModal(true);
          }}
          onSearchSpecific={() => setShowSearchEmailsModal(true)}
          isGmailConnected={isGmailConnected}
        />
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

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => {
            setShowAddEventModal(false);
            setAddEventTab("manual");
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-strong my-4 md:my-8 max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-primary-400 to-primary-500 rounded-t-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white">Add New Event</h2>
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

              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddEventTab("manual")}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    addEventTab === "manual"
                      ? "bg-white text-primary-600 shadow-soft"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  type="button"
                  onClick={() => setAddEventTab("paste")}
                  className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                    addEventTab === "paste"
                      ? "bg-white text-primary-600 shadow-soft"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Paste Text
                </button>
              </div>
            </div>

            {/* Paste Text Tab */}
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
                    rows={10}
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
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={conversationalInput}
                      onChange={(e) => setConversationalInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleParseConversational())}
                      className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder='e.g., "Emma has soccer every Tuesday at 5pm" or "dentist tomorrow at 3"'
                    />
                    <button
                      type="button"
                      onClick={handleParseConversational}
                      disabled={isParsingConversational || !conversationalInput.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
                          ✨ Auto-Fill
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
                  <div className="space-y-2 p-3 border border-gray-300 rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                    {familyMembers && familyMembers.length > 0 ? (
                      [...familyMembers].sort((a, b) => a.name.localeCompare(b.name)).map((member) => {
                        const selectedMembers = newEventForm.childName ? newEventForm.childName.split(", ") : [];
                        const isChecked = selectedMembers.includes(member.name);

                        return (
                          <label key={member._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let updatedMembers = [...selectedMembers];
                                if (e.target.checked) {
                                  updatedMembers.push(member.name);
                                } else {
                                  updatedMembers = updatedMembers.filter(m => m !== member.name);
                                }
                                setNewEventForm({
                                  ...newEventForm,
                                  childName: updatedMembers.join(", ")
                                });
                              }}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                            />
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium text-white"
                              style={{ backgroundColor: member.color || "#6366f1" }}
                            >
                              {member.name}
                            </span>
                          </label>
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

      {/* Actions Modal */}
      {showActionsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowActionsModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full shadow-strong my-4 md:my-8 max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-secondary-400 to-secondary-500 rounded-t-2xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">⚠️ Actions Needed</h2>
                  <p className="text-white/90 text-sm">
                    RSVPs, payments, forms, and other things that need your attention
                  </p>
                </div>
                <button
                  onClick={() => setShowActionsModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                  aria-label="Close actions modal"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Actions List */}
            <div className="p-6">
              {(() => {
                // Get all events with upcoming actions (within next 2 weeks)
                const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                const actionsNeeded = weekEvents?.filter((e) => {
                  if (!e.requiresAction || e.actionCompleted) return false;
                  const relevantDate = e.actionDeadline || e.eventDate;
                  return relevantDate >= today && relevantDate <= twoWeeksFromNow;
                }).sort((a, b) => {
                  // Sort by deadline/event date (soonest first)
                  const dateA = a.actionDeadline || a.eventDate;
                  const dateB = b.actionDeadline || b.eventDate;
                  return dateA.localeCompare(dateB);
                }) || [];

                if (actionsNeeded.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
                      <p className="text-gray-600">
                        You don't have any pending actions right now. Great job! 🎉
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      You have {actionsNeeded.length} {actionsNeeded.length === 1 ? 'action' : 'actions'} that need attention in the next 2 weeks:
                    </p>
                    {actionsNeeded.map((event) => {
                      const deadline = event.actionDeadline || event.eventDate;
                      const deadlineDate = new Date(deadline);
                      const daysUntil = Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      const isUrgent = daysUntil <= 3;

                      return (
                        <div
                          key={event._id}
                          className={`border-2 rounded-xl p-5 ${
                            isUrgent ? 'border-red-300 bg-red-50' : 'border-secondary-200 bg-secondary-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {isUrgent && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                                    URGENT
                                  </span>
                                )}
                                <span className="px-2 py-1 bg-secondary-100 text-secondary-800 text-xs font-semibold rounded">
                                  {event.category || "Other"}
                                </span>
                              </div>
                              <h4 className="font-bold text-gray-900 text-lg mb-1">{event.title}</h4>
                              {event.childName && (
                                <p className="text-sm text-gray-600 mb-2">For: {event.childName}</p>
                              )}
                              <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-semibold">
                                  {event.actionDeadline ? 'Deadline:' : 'Event Date:'}
                                </span>
                                <span>
                                  {new Date(deadline).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                                <span className={`font-semibold ${isUrgent ? 'text-red-600' : 'text-secondary-500'}`}>
                                  ({daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow!' : `in ${daysUntil} days`})
                                </span>
                              </div>
                              {event.actionDescription && (
                                <div className="bg-white border border-orange-200 rounded-lg p-3 mb-3">
                                  <p className="text-sm font-semibold text-gray-900 mb-1">Action Needed:</p>
                                  <p className="text-sm text-gray-700">{event.actionDescription}</p>
                                </div>
                              )}
                              {event.location && (
                                <p className="text-sm text-gray-600 mb-2">
                                  📍 {event.location}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                await updateEvent({
                                  eventId: event._id,
                                  actionCompleted: true,
                                });
                                showToast("Action marked as complete!", "success");
                              }}
                              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors whitespace-nowrap"
                            >
                              ✓ Mark Done
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowActionsModal(false)}
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Emails Modal */}
      {showSearchEmailsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowSearchEmailsModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full shadow-strong my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-accent-400 to-accent-500 rounded-t-2xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">🔍 Search Your Emails</h2>
                  <p className="text-white/90 text-sm">
                    Find any event from your entire email history - schedules, registrations, you name it!
                  </p>
                </div>
                <button
                  onClick={() => setShowSearchEmailsModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                  aria-label="Close search modal"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Form */}
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What are you looking for?
                </label>
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    value={emailSearchQuery}
                    onChange={(e) => setEmailSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSearchingEmails && emailSearchQuery.trim()) {
                        // Trigger search on Enter
                        document.getElementById('search-emails-btn')?.click();
                      }
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., baseball schedule, soccer registration, piano recital..."
                  />
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      How far back to search?
                    </label>
                    <select
                      value={emailSearchTimeframe}
                      onChange={(e) => setEmailSearchTimeframe(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="1">Last month</option>
                      <option value="3">Last 3 months (Recommended)</option>
                      <option value="6">Last 6 months</option>
                      <option value="12">Last year</option>
                    </select>
                  </div>
                  <button
                    id="search-emails-btn"
                    onClick={async () => {
                      if (!emailSearchQuery.trim() || isSearchingEmails) return;

                      setIsSearchingEmails(true);
                      setEmailSearchResults([]);
                      setEmailSearchProgress({ current: 0, total: 0 });

                      try {
                        const response = await fetch("/api/search-emails", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            query: emailSearchQuery,
                            familyId: convexUser?.familyId,
                            timeframeMonths: parseInt(emailSearchTimeframe)
                          }),
                        });

                        const data = await response.json();

                        if (data.error) {
                          showToast(data.error, "error");
                        } else {
                          setEmailSearchResults(data.results || []);
                          if (data.results && data.results.length === 0) {
                            showToast("No events found matching your search", "info");
                          } else {
                            showToast(`Found ${data.results.length} event(s)!`, "success");
                          }
                        }
                      } catch (error) {
                        console.error("Search error:", error);
                        showToast("Failed to search emails. Please try again.", "error");
                      } finally {
                        setIsSearchingEmails(false);
                      }
                    }}
                    disabled={!emailSearchQuery.trim() || isSearchingEmails}
                    className="px-6 py-3 bg-accent-500 text-white rounded-lg font-semibold hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-soft flex items-center gap-2"
                  >
                    {isSearchingEmails ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Searching...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: Be specific! Try "baseball practice schedule" or "soccer team registration"
                </p>
              </div>

              {/* Results */}
              {emailSearchResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Found {emailSearchResults.length} event(s):
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {emailSearchResults.map((event: any, idx: number) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{event.title}</h4>
                            <div className="text-sm text-gray-600 mt-1 space-y-1">
                              <div>📅 {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                              {event.eventTime && <div>🕐 {event.eventTime}</div>}
                              {event.location && <div>📍 {event.location}</div>}
                              {event.description && <div className="text-gray-500 mt-2">{event.description}</div>}
                              {event.sourceEmailSubject && (
                                <div className="text-xs text-primary-500 mt-2">
                                  📧 From: {event.sourceEmailSubject}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await createEvent({
                                  createdByUserId: convexUser!._id,
                                  title: event.title,
                                  eventDate: event.eventDate,
                                  eventTime: event.eventTime || undefined,
                                  endTime: event.endTime || undefined,
                                  location: event.location || undefined,
                                  category: event.category || undefined,
                                  childName: event.childName || undefined,
                                  description: event.description || undefined,
                                  requiresAction: event.requiresAction || undefined,
                                  actionDescription: event.actionDescription || undefined,
                                  actionDeadline: event.actionDeadline || undefined,
                                  isConfirmed: true,
                                });
                                showToast(`✓ Added "${event.title}" to your calendar!`, "success");
                                // Remove from results
                                setEmailSearchResults(prev => prev.filter((_, i) => i !== idx));
                              } catch (error) {
                                console.error("Error adding event:", error);
                                showToast("Failed to add event", "error");
                              }
                            }}
                            className="ml-4 px-4 py-2 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 transition text-sm whitespace-nowrap"
                          >
                            + Add to Calendar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isSearchingEmails && (
                <div className="text-center py-12">
                  <svg className="animate-spin h-12 w-12 text-accent-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-900 font-semibold text-lg">Searching your emails...</p>
                  <p className="text-gray-600 mt-2">
                    Scanning {emailSearchTimeframe === "1" ? "last month" : emailSearchTimeframe === "3" ? "last 3 months" : emailSearchTimeframe === "6" ? "last 6 months" : "last year"} for "{emailSearchQuery}"
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 bg-accent-50 px-4 py-2 rounded-lg">
                    <svg className="animate-pulse w-5 h-5 text-accent-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span className="text-sm text-accent-700 font-medium">
                      Estimated time: {
                        emailSearchTimeframe === "1" ? "30-60 seconds" :
                        emailSearchTimeframe === "3" ? "1-2 minutes" :
                        emailSearchTimeframe === "6" ? "2-3 minutes" :
                        "3-5 minutes"
                      }
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Please wait while we find all your events...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
              <button
                onClick={() => {
                  setShowSearchEmailsModal(false);
                  setEmailSearchQuery("");
                  setEmailSearchTimeframe("3");
                  setEmailSearchResults([]);
                  setEmailSearchProgress({ current: 0, total: 0 });
                }}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB removed - Quick Actions now prominently displayed on mobile home screen */}

      {/* Bottom Navigation for Mobile */}
      <BottomNav />

      {/* Confirm Dialog */}
      {confirmDialogConfig && (
        <ConfirmDialog
          isOpen={showConfirmDialog}
          title={confirmDialogConfig.title}
          message={confirmDialogConfig.message}
          onConfirm={confirmDialogConfig.onConfirm}
          onCancel={() => setShowConfirmDialog(false)}
          variant={confirmDialogConfig.variant}
          itemCount={confirmDialogConfig.itemCount}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <StatCardSkeleton />
          <p className="text-gray-600 mt-4">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
