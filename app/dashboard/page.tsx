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
  const [showAddEventChoiceModal, setShowAddEventChoiceModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [addEventTab, setAddEventTab] = useState<"manual" | "paste">("manual");
  const [pastedText, setPastedText] = useState("");
  const [isExtractingEvent, setIsExtractingEvent] = useState(false);
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
  });
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
        if (showAddEventModal) {
          setShowAddEventModal(false);
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
  }, [showAddEventModal, selectedEvent, showScanModal, showToast]);

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
        body: JSON.stringify({ smsText: pastedText }),
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

  return (
    <div className="min-h-screen bg-gray-50">
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
              Review Events
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
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-500 to-primary-600">
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
                  Review Events
                </Link>
                <Link
                  href="/discover"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find Activities
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
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

        {/* Personalized Greeting with Family Branding */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {clerkUser && (() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
                const firstName = clerkUser.firstName || clerkUser.fullName?.split(' ')[0] || "there";
                return `${greeting}, ${firstName}`;
              })()}
            </h1>
            {family?.name && (
              <div className="text-base sm:text-lg font-semibold text-primary-600">
                {family.name} Family Hub
              </div>
            )}
          </div>
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

        {/* Stats Cards - Now Clickable! */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* This Week Card */}
          <Link
            href="/calendar"
            className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-medium p-6 text-white hover:shadow-strong transition-all duration-200 transform hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">7 days</span>
            </div>
            <h3 className="text-white/90 font-medium mb-2 text-sm">This Week</h3>
            <p className="text-4xl font-bold mb-1">
              {weekEvents === undefined ? (
                <span className="inline-block w-12 h-10 bg-white/20 rounded animate-pulse"></span>
              ) : weekEvents.length}
            </p>
            <p className="text-sm text-white/80">Click to view calendar →</p>
          </Link>

          {/* Needs Action Card */}
          <div
            onClick={() => setShowActionsModal(true)}
            className="bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-xl shadow-medium p-6 text-white hover:shadow-strong transition-all duration-200 transform hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Action</span>
            </div>
            <h3 className="text-white/90 font-medium mb-2 text-sm">Needs Action</h3>
            <p className="text-4xl font-bold mb-1">
              {weekEvents === undefined ? (
                <span className="inline-block w-12 h-10 bg-white/20 rounded animate-pulse"></span>
              ) : (() => {
                  // Filter for upcoming actions only (within next 2 weeks)
                  const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  return weekEvents.filter((e) => {
                    if (!e.requiresAction || e.actionCompleted) return false;
                    // Check if action deadline or event date is in the future
                    const relevantDate = e.actionDeadline || e.eventDate;
                    return relevantDate >= today && relevantDate <= twoWeeksFromNow;
                  }).length;
                })()
              }
            </p>
            <p className="text-sm text-white/80">Click to view actions →</p>
          </div>

          {/* To Review Card */}
          <Link
            href="/review"
            className="bg-gradient-to-br from-accent-400 to-accent-600 rounded-xl shadow-medium p-6 text-white hover:shadow-strong transition-all duration-200 transform hover:-translate-y-1 cursor-pointer"
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
            <h3 className="text-white/90 font-medium mb-2 text-sm">To Review</h3>
            <p className="text-4xl font-bold mb-1">
              {unconfirmedEvents === undefined ? (
                <span className="inline-block w-12 h-10 bg-white/20 rounded animate-pulse"></span>
              ) : unconfirmedEvents.length}
            </p>
            <p className="text-sm text-white/80">Click to review events →</p>
          </Link>
        </div>

        {/* Today's Events - Prominent Section */}
        {todayEvents && todayEvents.length > 0 && (
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 mb-8 border-2 border-primary-200">
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Events */}
          <div id="upcoming-events" className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Next 7 Days
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">All upcoming events this week</p>
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
              <div className="divide-y divide-gray-200">
                {upcomingEvents === undefined ? (
                  <>
                    <EventCardSkeleton />
                    <EventCardSkeleton />
                    <EventCardSkeleton />
                  </>
                ) : upcomingEvents.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Let's get started!</h3>
                    <p className="text-gray-600 mb-6">Add your first event and we'll help you stay organized.</p>

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
                  groupEventsByDate(upcomingEvents).map(({ date, events }) => (
                    <div key={date}>
                      {/* Date Header */}
                      <div className="px-6 py-3 bg-gray-50 border-y border-gray-200">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {formatMomFriendlyDate(date)}
                        </h3>
                      </div>
                      {/* Events for this day */}
                      {events.map((event: any) => (
                        <div
                          key={event._id}
                          className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 flex items-start gap-3">
                              {event.category && (
                                <div
                                  className="w-1 h-full rounded-full flex-shrink-0"
                                  style={{ backgroundColor: getCategoryColor(event.category), minHeight: '60px' }}
                                  title={event.category}
                                  aria-label={event.category}
                                />
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-2">
                                  {event.title}
                                </h3>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                                  {event.eventTime && (
                                    <span className="font-medium">{formatTime12Hour(event.eventTime)}</span>
                                  )}
                                  {event.location && (
                                    <span>{event.location}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="sm:ml-4 flex flex-col gap-2 items-end">
                              {event.childName && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-800">
                                  {event.childName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Add Event Button - Progressive Disclosure */}
          <div className="lg:col-span-1">
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

      {/* Floating Action Button - Mobile Only */}
      <button
        onClick={() => setShowAddEventModal(true)}
        title="Add new event"
        aria-label="Add new event"
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-strong flex items-center justify-center text-white hover:shadow-xl transition-all duration-200 z-50 transform hover:scale-110"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

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
                          Review Events →
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => {
            setSelectedEvent(null);
            setIsEditingEvent(false);
            setEditFormData(null);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-strong my-8"
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
                          actionDeadline: e.target.checked ? editFormData?.actionDeadline : ""
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
                </div>

                {/* Action Buttons */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex flex-col sm:flex-row gap-3">
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
                              await updateEvent({
                                eventId: selectedEvent._id,
                                actionCompleted: !selectedEvent.actionCompleted,
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
                    onClick={async () => {
                      if (confirm(`Delete "${selectedEvent.title}"?`)) {
                        try {
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
                          showToast(`✓ Event "${selectedEvent.title}" deleted`, "success", undefined, 7000);
                        } catch (error) {
                          console.error("Error deleting event:", error);
                          showToast("Failed to delete event. Please try again.", "error");
                        }
                      }
                    }}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition shadow-soft flex items-center justify-center gap-2"
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
          onSearchSpecific={() => setShowSearchEmailsModal(true)}
          isGmailConnected={isGmailConnected}
        />
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => {
            setShowAddEventModal(false);
            setAddEventTab("manual");
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-strong my-8"
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
              <div className="p-6 space-y-4">
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowActionsModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full shadow-strong my-8"
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
