"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MobileNav from "@/app/components/MobileNav";
import BottomNav from "@/app/components/BottomNav";
import { EventCardSkeleton } from "@/app/components/LoadingSkeleton";
import { useToast } from "@/app/components/Toast";
import CelebrationToast from "@/app/components/CelebrationToast";
import PhotoUploadModal from "@/app/components/PhotoUploadModal";
import VoiceRecordModal from "@/app/components/VoiceRecordModal";

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

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [showSearchEmailsModal, setShowSearchEmailsModal] = useState(false);
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [showVoiceRecordModal, setShowVoiceRecordModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [approvedEventId, setApprovedEventId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 10;
  const [recentlyDismissed, setRecentlyDismissed] = useState<{eventId: string, event: any, timeout: NodeJS.Timeout} | null>(null);
  const [recentlyApproved, setRecentlyApproved] = useState<{eventId: string, timeout: NodeJS.Timeout} | null>(null);
  const [showPasteTextModal, setShowPasteTextModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isExtractingEvent, setIsExtractingEvent] = useState(false);
  const [isEnhancingEvent, setIsEnhancingEvent] = useState(false);
  const [conversationalInput, setConversationalInput] = useState("");
  const [isParsingConversational, setIsParsingConversational] = useState(false);
  const [emailSearchQuery, setEmailSearchQuery] = useState("");
  const [emailSearchTimeframe, setEmailSearchTimeframe] = useState("3"); // months
  const [isSearchingEmails, setIsSearchingEmails] = useState(false);
  const [emailSearchProgress, setEmailSearchProgress] = useState({ current: 0, total: 0 });
  const [emailSearchResults, setEmailSearchResults] = useState<any[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState("");
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
    recurrenceInterval: 1,
    recurrenceDaysOfWeek: [] as string[],
    recurrenceEndType: "never" as "never" | "date" | "count",
    recurrenceEndDate: "",
    recurrenceEndCount: 10,
  });
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { showToast } = useToast();

  // Get user from Convex
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Get Gmail accounts to check if any are connected
  const gmailAccounts = useQuery(
    api.gmailAccounts.getFamilyGmailAccounts,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get unconfirmed events
  const unconfirmedEvents = useQuery(
    api.events.getUnconfirmedEvents,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get confirmed events for conflict detection
  const confirmedEvents = useQuery(
    api.events.getConfirmedEvents,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get family members for the dropdown
  const familyMembers = useQuery(
    api.familyMembers.getFamilyMembers,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get all categories (default + custom)
  const allCategories = useQuery(
    api.families.getAllCategories,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get all events for category extraction
  const allEvents = useQuery(
    api.events.getAllEvents,
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

  // Mutations
  const confirmEvent = useMutation(api.events.confirmEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const createEvent = useMutation(api.events.createEvent);
  const createUnconfirmedEvent = useMutation(api.events.createUnconfirmedEvent);
  const addCustomCategory = useMutation(api.families.addCustomCategory);

  // Handle query parameters for adding event from calendar
  useEffect(() => {
    const addEvent = searchParams?.get('addEvent');
    const date = searchParams?.get('date');

    if (addEvent === 'true' && date) {
      // Pre-fill the date in the new event form
      setNewEventForm(prev => ({
        ...prev,
        eventDate: date
      }));

      // Open the manual add event modal
      setShowAddEventModal(true);

      // Clear the query parameters from the URL without reloading
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/review');
      }
    }
  }, [searchParams]);

  // Check for time conflicts with existing events
  const checkForConflicts = (newEvent: any) => {
    if (!confirmedEvents || !newEvent.eventTime) return null;

    const conflicts = confirmedEvents.filter((existingEvent: any) => {
      // Skip if different dates
      if (existingEvent.eventDate !== newEvent.eventDate) return false;

      // Skip if no time info
      if (!existingEvent.eventTime) return false;

      // Parse times
      const newStart = newEvent.eventTime;
      const newEnd = newEvent.endTime || newEvent.eventTime;
      const existingStart = existingEvent.eventTime;
      const existingEnd = existingEvent.endTime || existingEvent.eventTime;

      // Check if times overlap
      return (newStart < existingEnd && newEnd > existingStart);
    });

    return conflicts.length > 0 ? conflicts[0] : null;
  };

  const handleApprove = async (eventId: Id<"events">) => {
    // Find the event being approved
    const eventToApprove = unconfirmedEvents?.find((e: any) => e._id === eventId);

    // Check for conflicts
    const conflict = eventToApprove ? checkForConflicts(eventToApprove) : null;

    if (conflict) {
      const confirmOverride = window.confirm(
        `⚠️ Time Conflict Detected!\n\nThis event overlaps with "${conflict.title}" on ${conflict.eventDate} at ${conflict.eventTime}.\n\nDo you want to add it anyway?`
      );

      if (!confirmOverride) {
        return; // User cancelled
      }
    }

    // Clear any existing approved event timeout
    if (recentlyApproved) {
      clearTimeout(recentlyApproved.timeout);
    }

    await confirmEvent({ eventId });

    // Set up undo timeout (5 seconds to undo)
    const timeout = setTimeout(() => {
      setRecentlyApproved(null);
    }, 5000);

    setRecentlyApproved({
      eventId,
      timeout
    });

    // Show confirmation feedback
    setApprovedEventId(eventId);
    setTimeout(() => setApprovedEventId(null), 3000);

    // Automatically sync to Google Calendar
    try {
      await fetch("/api/push-to-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
    } catch (error) {
      console.error("Failed to auto-sync to Google Calendar:", error);
      // Don't show error to user - they can manually sync later from calendar page
    }
  };

  const handleReject = async (eventId: Id<"events">) => {
    // Find the event being dismissed
    const eventToDismiss = unconfirmedEvents?.find((e: any) => e._id === eventId);

    if (!eventToDismiss) {
      await deleteEvent({ eventId });
      return;
    }

    // Clear any existing dismissed event timeout
    if (recentlyDismissed) {
      clearTimeout(recentlyDismissed.timeout);
    }

    // Delete the event immediately from the view
    await deleteEvent({ eventId });

    // Set up undo timeout (5 seconds to undo)
    const timeout = setTimeout(() => {
      setRecentlyDismissed(null);
    }, 5000);

    setRecentlyDismissed({
      eventId,
      event: eventToDismiss,
      timeout
    });
  };

  const handleUndoDismiss = async () => {
    if (!recentlyDismissed || !convexUser?.familyId) return;

    // Clear the timeout
    clearTimeout(recentlyDismissed.timeout);

    // Re-create the event
    const event = recentlyDismissed.event;
    await createUnconfirmedEvent({
      familyId: convexUser.familyId,
      createdByUserId: convexUser._id,
      title: event.title,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      endTime: event.endTime,
      location: event.location,
      category: event.category,
      childName: event.childName,
      description: event.description,
      sourceEmailId: event.sourceEmailId,
      sourceEmailSubject: event.sourceEmailSubject,
      sourceGmailAccountId: event.sourceGmailAccountId,
      requiresAction: event.requiresAction,
      actionDeadline: event.actionDeadline,
      actionDescription: event.actionDescription,
    });

    setRecentlyDismissed(null);
  };

  const handleUndoApprove = async () => {
    if (!recentlyApproved) return;

    // Clear the timeout
    clearTimeout(recentlyApproved.timeout);

    // Unconfirm the event (set isConfirmed back to false)
    await updateEvent({
      eventId: recentlyApproved.eventId as Id<"events">,
      isConfirmed: false,
    });

    // Try to delete from Google Calendar if it was synced
    try {
      await fetch("/api/delete-from-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: recentlyApproved.eventId }),
      });
    } catch (error) {
      console.error("Failed to delete from Google Calendar:", error);
    }

    setRecentlyApproved(null);
    setApprovedEventId(null);
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    setShowEditEventModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEvent) return;

    const formData = new FormData(e.currentTarget);

    // Get selected family members from checkboxes
    const selectedMembers = formData.getAll("familyMembers") as string[];
    const childName = selectedMembers.join(", ");

    const category = formData.get("category") as string;

    // Check if this is a new custom category
    if (category && allCategories && convexUser?.familyId) {
      const isDefaultCategory = allCategories.defaultCategories.includes(category);
      const isExistingCustom = allCategories.customCategories.includes(category);

      if (!isDefaultCategory && !isExistingCustom) {
        // Add new custom category
        await addCustomCategory({
          familyId: convexUser.familyId,
          category: category,
        });
      }
    }

    await updateEvent({
      eventId: editingEvent._id,
      title: formData.get("title") as string,
      eventDate: formData.get("eventDate") as string,
      eventTime: formData.get("eventTime") as string || undefined,
      endTime: formData.get("endTime") as string || undefined,
      location: formData.get("location") as string || undefined,
      category: category || undefined,
      childName: childName || undefined,
      description: formData.get("description") as string || undefined,
      requiresAction: formData.get("requiresAction") === "on",
      actionDeadline: formData.get("actionDeadline") as string || undefined,
      actionDescription: formData.get("actionDescription") as string || undefined,
      actionCompleted: formData.get("actionCompleted") === "on",
    });

    setShowEditEventModal(false);
    setEditingEvent(null);
  };

  const handleExtractFromPaste = async () => {
    if (!pastedText.trim()) {
      showToast("Please paste some text first", "error");
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

      if (data.error) {
        showToast(data.error, "error");
        return;
      }

      // Check if events were found
      if (!data.hasEvents || !data.events || data.events.length === 0) {
        showToast("No event details found in the text. Please try again.", "error");
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
        showToast(`✓ Found ${data.events.length} events! Review them below.`, "success");
      } else {
        // Single event - populate the form for manual review/editing
        const event = data.events[0];
        setNewEventForm({
          title: event.title || "",
          eventDate: event.date || "",
          eventTime: event.time || "",
          endTime: event.endTime || "",
          location: event.location || "",
          category: categoryMap[event.category] || "Sports",
          childName: "",
          description: event.description || "",
          requiresAction: false,
          actionDescription: "",
          actionDeadline: "",
        });

        // Switch to manual tab to show the populated form
        setAddEventTab("manual");
        showToast("Event details extracted! Review and save below.", "success");
      }
    } catch (error) {
      console.error("Error extracting event:", error);
      showToast("Failed to extract event details. Please try again.", "error");
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

      const categoryMap: {[key: string]: string} = {
        "sports": "Sports",
        "arts": "Lessons",
        "education": "School",
        "entertainment": "Other",
        "family": "Other",
        "other": "Other"
      };

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
      showToast(`✓ Found ${createdCount} event${createdCount > 1 ? 's' : ''} from photo! Review below to approve.`, "success", undefined, 7000);
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

      const categoryMap: {[key: string]: string} = {
        "sports": "Sports",
        "arts": "Lessons",
        "education": "School",
        "entertainment": "Other",
        "family": "Other",
        "other": "Other"
      };

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
      showToast(`✓ Found ${createdCount} event${createdCount > 1 ? 's' : ''} from recording! Review below to approve.`, "success", undefined, 7000);
    } catch (error: any) {
      console.error("Error extracting event from voice:", error);
      showToast("Failed to extract event from recording. Please try again or enter manually.", "error");
    }
  };

  // Handle AI enhancement of event details
  const handleEnhanceEvent = async () => {
    if (!newEventForm.title.trim()) {
      showToast("Please enter an event title first", "info");
      return;
    }

    setIsEnhancingEvent(true);
    try {
      const response = await fetch("/api/enhance-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEventForm.title,
          category: newEventForm.category,
          location: newEventForm.location,
          time: newEventForm.eventTime,
          childName: newEventForm.childName,
          familyMembers: familyMembers || [],
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to enhance event");
      }

      // Update form with all enhanced details
      setNewEventForm({
        ...newEventForm,
        title: data.enhancedTitle || newEventForm.title,
        description: data.description || newEventForm.description,
        category: data.category || newEventForm.category,
        childName: data.attendees && data.attendees.length > 0 ? data.attendees.join(", ") : newEventForm.childName,
        isRecurring: data.isRecurring !== undefined ? data.isRecurring : newEventForm.isRecurring,
        recurrencePattern: data.recurrencePattern || newEventForm.recurrencePattern,
        recurrenceDaysOfWeek: data.recurrenceDaysOfWeek || newEventForm.recurrenceDaysOfWeek,
        requiresAction: data.requiresAction !== undefined ? data.requiresAction : newEventForm.requiresAction,
        actionDescription: data.actionDescription || newEventForm.actionDescription,
      });

      showToast("✨ Event enhanced! AI filled in smart suggestions - review and adjust as needed.", "success");
    } catch (error: any) {
      console.error("Error enhancing event:", error);
      showToast("Failed to enhance event. Please try again.", "error");
    } finally {
      setIsEnhancingEvent(false);
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
        isRecurring: event.isRecurring || false,
        recurrencePattern: event.recurrencePattern || "weekly",
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: event.recurrenceDaysOfWeek || [],
        recurrenceEndType: "never",
        recurrenceEndDate: "",
        recurrenceEndCount: 10,
      });

      showToast("✨ AI filled the form! Review and adjust as needed.", "success");
      setConversationalInput(""); // Clear the input
    } catch (error: any) {
      console.error("Error parsing conversational input:", error);
      showToast("Failed to parse your description. Please try again or fill manually.", "error");
    } finally {
      setIsParsingConversational(false);
    }
  };

  // Handle AI enhancement for edit event modal
  const handleEnhanceEditEvent = async () => {
    if (!editingEvent?.title?.trim()) {
      showToast("Please enter an event title first", "info");
      return;
    }

    setIsEnhancingEvent(true);
    try {
      const response = await fetch("/api/enhance-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingEvent.title,
          category: editingEvent.category,
          location: editingEvent.location,
          time: editingEvent.eventTime,
          childName: editingEvent.childName,
          familyMembers: familyMembers || [],
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to enhance event");
      }

      // Update editing event with all enhanced details
      setEditingEvent({
        ...editingEvent,
        title: data.enhancedTitle || editingEvent.title,
        description: data.description || editingEvent.description,
        category: data.category || editingEvent.category,
        childName: data.attendees && data.attendees.length > 0 ? data.attendees.join(", ") : editingEvent.childName,
        isRecurring: data.isRecurring !== undefined ? data.isRecurring : editingEvent.isRecurring,
        recurrencePattern: data.recurrencePattern || editingEvent.recurrencePattern,
        recurrenceDaysOfWeek: data.recurrenceDaysOfWeek || editingEvent.recurrenceDaysOfWeek,
        requiresAction: data.requiresAction !== undefined ? data.requiresAction : editingEvent.requiresAction,
        actionDescription: data.actionDescription || editingEvent.actionDescription,
      });

      showToast("✨ Event enhanced! AI filled in smart suggestions - review and adjust as needed.", "success");
    } catch (error: any) {
      console.error("Error enhancing event:", error);
      showToast("Failed to enhance event. Please try again.", "error");
    } finally {
      setIsEnhancingEvent(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("handleAddEvent called");
    console.log("convexUser:", convexUser);
    console.log("newEventForm:", newEventForm);

    if (!convexUser?._id || !convexUser?.familyId) {
      console.error("No convexUser._id found");
      showToast("Session expired. Please refresh the page and try again.", "error");
      return;
    }

    // Validate required fields
    if (!newEventForm.title.trim()) {
      showToast("Please enter an event title", "error");
      return;
    }

    if (!newEventForm.eventDate) {
      showToast("Please select a date for this event", "error");
      return;
    }

    try {
      // Check if this is a new custom category
      if (newEventForm.category && allCategories) {
        const isDefaultCategory = allCategories.defaultCategories.includes(newEventForm.category);
        const isExistingCustom = allCategories.customCategories.includes(newEventForm.category);

        if (!isDefaultCategory && !isExistingCustom) {
          // Add new custom category
          await addCustomCategory({
            familyId: convexUser.familyId,
            category: newEventForm.category,
          });
        }
      }

      console.log("Creating event with data:", {
        createdByUserId: convexUser._id,
        title: newEventForm.title.trim(),
        eventDate: newEventForm.eventDate,
        eventTime: newEventForm.eventTime || undefined,
        endTime: newEventForm.endTime || undefined,
        location: newEventForm.location.trim() || undefined,
        category: newEventForm.category || undefined,
        childName: newEventForm.childName.trim() || undefined,
        description: newEventForm.description.trim() || undefined,
        isConfirmed: true,
      });

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
        isConfirmed: true, // Manually added events are auto-confirmed
        isRecurring: newEventForm.isRecurring || false,
        recurrencePattern: newEventForm.isRecurring ? newEventForm.recurrencePattern : undefined,
        recurrenceInterval: newEventForm.isRecurring ? newEventForm.recurrenceInterval : undefined,
        recurrenceDaysOfWeek: newEventForm.isRecurring && newEventForm.recurrenceDaysOfWeek.length > 0 ? newEventForm.recurrenceDaysOfWeek : undefined,
        recurrenceEndType: newEventForm.isRecurring ? newEventForm.recurrenceEndType : undefined,
        recurrenceEndDate: newEventForm.isRecurring && newEventForm.recurrenceEndType === "date" ? newEventForm.recurrenceEndDate : undefined,
        recurrenceEndCount: newEventForm.isRecurring && newEventForm.recurrenceEndType === "count" ? newEventForm.recurrenceEndCount : undefined,
      });

      console.log("Event created successfully with ID:", eventId);

      // Reset form
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
        recurrencePattern: "weekly",
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: [],
        recurrenceEndType: "never",
        recurrenceEndDate: "",
        recurrenceEndCount: 10,
      });

      // Close modal
      setShowAddEventModal(false);

      // Show success message
      setApprovedEventId(eventId as string);
      setTimeout(() => setApprovedEventId(null), 3000);

      // Try to sync to Google Calendar
      try {
        await fetch("/api/push-to-calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        });
      } catch (error) {
        console.error("Failed to auto-sync to Google Calendar:", error);
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    }
  };

  const handleScanEmail = async () => {
    if (!gmailAccounts || gmailAccounts.length === 0) {
      setScanMessage("Please connect a Gmail account first");
      setTimeout(() => setScanMessage(""), 3000);
      return;
    }

    setIsScanning(true);
    setScanMessage("Checking your emails for schedules...");

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

      if (response.ok) {
        setScanMessage(
          `✓ Done! Found ${data.eventsFound} event(s) from ${data.messagesScanned} emails.`
        );
        setTimeout(() => setScanMessage(""), 5000);
      } else {
        setScanMessage(`Oops! ${data.error}`);
        setTimeout(() => setScanMessage(""), 5000);
      }
    } catch (error) {
      console.error("Scan error:", error);
      setScanMessage("Couldn't check your emails. Want to try again?");
      setTimeout(() => setScanMessage(""), 5000);
    } finally {
      setIsScanning(false);
    }
  };

  const getCategoryIcon = (category: string | undefined) => {
    switch (category?.toLowerCase()) {
      case "sports":
        return "⚽";
      case "school":
        return "🏫";
      case "medical":
        return "💉";
      case "birthday party":
      case "birthday":
        return "🎂";
      case "music":
        return "🎵";
      case "dance":
        return "💃";
      case "arts & crafts":
      case "art":
        return "🎨";
      default:
        return "📅";
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high": return "bg-primary-100 text-primary-800 border-primary-300";
      case "medium": return "bg-secondary-100 text-secondary-800 border-secondary-300";
      case "low": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Celebration Toast */}
      {showCelebration && (
        <CelebrationToast
          message={celebrationMessage}
          onClose={() => setShowCelebration(false)}
        />
      )}
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            Our Daily Family
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link href="/calendar" className="text-gray-600 hover:text-gray-900">
              Calendar
            </Link>
            <Link href="/review" className="text-primary-600 font-medium">
              Events
            </Link>
            <Link href="/discover" className="text-gray-600 hover:text-gray-900">
              Find Activities
            </Link>
            <Link href="/settings" className="text-gray-600 hover:text-gray-900">
              Settings
            </Link>
            <button onClick={() => signOut()} className="text-gray-600 hover:text-gray-900">
              Log Out
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-2xl text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        <MobileNav
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentPage="review"
        />
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">✨</span>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Events
              </h1>
              <p className="text-gray-600 text-lg mt-1">
                Your command center for everything happening
              </p>
            </div>
          </div>
          <p className="text-gray-600 max-w-3xl">
            Add events yourself, let us find them in your emails, or search for specific activities.
            Review new events we discover and approve the ones you want on your calendar - no more missed sign-ups or forgotten game days!
          </p>
        </div>

        {/* Undo Dismiss Banner */}
        {recentlyDismissed && (
          <div className="mb-6 bg-secondary-50 border border-secondary-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">↩️</span>
              <div>
                <p className="font-semibold text-amber-900">Event dismissed</p>
                <p className="text-sm text-amber-700">
                  "{recentlyDismissed.event.title}" was removed
                </p>
              </div>
            </div>
            <button
              onClick={handleUndoDismiss}
              className="px-4 py-2 bg-secondary-600 text-white rounded-lg font-semibold hover:bg-secondary-700 transition"
            >
              Undo
            </button>
          </div>
        )}

        {/* Scanning Progress Indicator */}
        {isScanning && (
          <div className="mb-6 p-4 bg-primary-50 border-2 border-primary-300 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary-900">Checking your emails...</p>
                <p className="text-sm text-primary-700 mt-0.5">Looking for schedules in your recent emails. This may take a moment.</p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Quick Add Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 rounded-2xl border-2 border-purple-200 shadow-lg">
            {/* Conversational Input */}
            <div className="mb-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">✨</span>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Add Events</h2>
                  <p className="text-sm text-gray-600">
                    Describe your events naturally and let AI help you add them!
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={conversationalInput}
                  onChange={(e) => setConversationalInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isParsingConversational && (e.preventDefault(), handleParseConversational())}
                  className="flex-1 px-5 py-4 text-lg border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm"
                  placeholder='e.g., "Emma has soccer every Tuesday at 5pm" or "dentist tomorrow at 3"'
                  disabled={isParsingConversational}
                />
                <button
                  onClick={handleParseConversational}
                  disabled={!conversationalInput.trim() || isParsingConversational}
                  className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                >
                  {isParsingConversational ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">Processing...</span>
                    </div>
                  ) : (
                    <span>✨ Add Event</span>
                  )}
                </button>
              </div>
            </div>

            {/* Inline Option Buttons */}
            <div className="border-t-2 border-purple-200 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Or add events using:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <button
                  onClick={() => setShowVoiceRecordModal(true)}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Voice</span>
                </button>

                <button
                  onClick={() => setShowPhotoUploadModal(true)}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all shadow-sm hover:shadow-md group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Photo</span>
                </button>

                <button
                  onClick={() => setShowPasteTextModal(true)}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all shadow-sm hover:shadow-md group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Paste Text</span>
                </button>

                <button
                  onClick={() => setShowAddEventModal(true)}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all shadow-sm hover:shadow-md group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Manual</span>
                </button>

                <button
                  onClick={() => setShowSearchEmailsModal(true)}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all shadow-sm hover:shadow-md group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Search Emails</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Completion Message */}
        {scanMessage && !isScanning && (
          <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg text-primary-800">
            {scanMessage}
          </div>
        )}

        {/* Approval Success Message with Undo */}
        {approvedEventId && recentlyApproved && (
          <div className="mb-6 bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold text-primary-900">Event approved and synced to Google Calendar</p>
                <p className="text-sm text-primary-700">The event has been added to your calendar</p>
              </div>
            </div>
            <button
              onClick={handleUndoApprove}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Undo
            </button>
          </div>
        )}

        {/* Stats Banner */}
        <div className="bg-primary-50 rounded-lg p-4 sm:p-6 mb-6 border border-primary-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                  {unconfirmedEvents === undefined
                    ? "Loading..."
                    : selectedEvents.size > 0
                    ? `${selectedEvents.size} of ${unconfirmedEvents.length} events selected`
                    : `${unconfirmedEvents.length} events need your review`}
                </h2>
                <p className="text-sm sm:text-base text-gray-700">
                  {selectedEvents.size > 0
                    ? "Use the buttons below to approve or dismiss selected events"
                    : "Found in your recent emails. Please confirm or edit them."}
                </p>
              </div>
              {unconfirmedEvents && unconfirmedEvents.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2">
                  {selectedEvents.size > 0 ? (
                    <>
                      <button
                        onClick={async () => {
                          for (const eventId of selectedEvents) {
                            await handleApprove(eventId as Id<"events">);
                          }
                          setSelectedEvents(new Set());
                        }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
                      >
                        Approve Selected ({selectedEvents.size})
                      </button>
                      <button
                        onClick={async () => {
                          for (const eventId of selectedEvents) {
                            await handleReject(eventId as Id<"events">);
                          }
                          setSelectedEvents(new Set());
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                      >
                        Dismiss Selected ({selectedEvents.size})
                      </button>
                      <button
                        onClick={() => setSelectedEvents(new Set())}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
                      >
                        Clear Selection
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const allIds = new Set<string>(unconfirmedEvents.map((e) => e._id));
                          setSelectedEvents(allIds);
                        }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
                      >
                        Select All
                      </button>
                      <button
                        onClick={async () => {
                          for (const event of unconfirmedEvents) {
                            await handleApprove(event._id);
                          }
                        }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
                      >
                        Approve All
                      </button>
                      <button
                        onClick={async () => {
                          for (const event of unconfirmedEvents) {
                            await handleReject(event._id);
                          }
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
                      >
                        Dismiss All
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unconfirmed Events List */}
        {unconfirmedEvents === undefined ? (
          <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        ) : unconfirmedEvents.length === 0 ? (
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl shadow-lg p-12 text-center border-2 border-green-200">
            <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <div className="text-7xl">🎉</div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              All Caught Up!
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              No events waiting for review. Great job staying organized!
            </p>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-6 max-w-lg mx-auto border border-green-200">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-2xl">✨</span>
                <h3 className="font-semibold text-gray-900 text-lg">Ready to add more events?</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Scroll up to use the Quick Add section! You can type naturally, use your voice, snap a photo of a flyer, or paste text from an email or message.
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto text-left">
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Auto-detected from Gmail</p>
                    <p className="text-sm text-gray-600">We check your emails daily and extract event details automatically. When we find something, it shows up here for you to review.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Events you add manually</p>
                    <p className="text-sm text-gray-600">When you add events using the Quick Add section above, they go straight to your calendar (no review needed!).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {(() => {
                // Pagination logic
                const totalPages = Math.ceil(unconfirmedEvents.length / eventsPerPage);
                const startIndex = (currentPage - 1) * eventsPerPage;
                const endIndex = startIndex + eventsPerPage;
                const paginatedEvents = unconfirmedEvents.slice(startIndex, endIndex);

                return paginatedEvents;
              })().map((event) => (
              <div key={event._id} className="bg-white rounded-xl shadow-soft border-2 border-yellow-200 overflow-hidden">
                {/* Why Review Banner */}
                <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
                  <p className="text-sm text-yellow-900 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Please double-check:</span> We found this in your email, but want to make sure the details are correct before adding to your calendar.
                  </p>
                </div>

                {/* Event Header */}
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedEvents.has(event._id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedEvents);
                        if (e.target.checked) {
                          newSelected.add(event._id);
                        } else {
                          newSelected.delete(event._id);
                        }
                        setSelectedEvents(newSelected);
                      }}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{getCategoryIcon(event.category)}</span>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {event.title}
                        </h3>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm mb-3">
                        <span className="font-semibold text-gray-900">{formatMomFriendlyDate(event.eventDate)}</span>
                        {event.eventTime && (
                          <span className="font-medium text-gray-700">
                            {formatTime12Hour(event.eventTime)}
                            {event.endTime && ` - ${formatTime12Hour(event.endTime)}`}
                          </span>
                        )}
                        {event.location && (
                          <span className="text-gray-600">{event.location}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {event.childName && (
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                            {event.childName}
                          </div>
                        )}
                        {event.category && (
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            {event.category}
                          </div>
                        )}
                        {event.requiresAction && (
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            RSVP Required {event.actionDeadline && `by ${event.actionDeadline}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Event Description */}
                  {event.description && (
                    <div className="bg-primary-50 rounded-lg p-3 mb-4 text-sm">
                      <div className="font-medium text-primary-900 mb-1">Details:</div>
                      <div className="text-gray-700">{event.description}</div>
                    </div>
                  )}

                  {/* Source Email Info */}
                  {event.sourceEmailSubject && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                      <div className="flex flex-col gap-2">
                        <div className="text-gray-600">
                          Found in email: <span className="font-medium text-gray-900">{event.sourceEmailSubject}</span>
                        </div>
                        {event.sourceGmailAccountId && gmailAccounts && (
                          <div className="text-gray-500 text-xs">
                            Gmail account: {gmailAccounts.find(a => a._id === event.sourceGmailAccountId)?.gmailEmail || 'Unknown'}
                          </div>
                        )}
                        {event.sourceEmailSubject && event.sourceGmailAccountId && gmailAccounts && (
                          <a
                            href={`https://mail.google.com/mail/#search/${encodeURIComponent(`subject:"${event.sourceEmailSubject}" in:${gmailAccounts.find(a => a._id === event.sourceGmailAccountId)?.gmailEmail || 'anywhere'}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition font-medium whitespace-nowrap self-start"
                            title={`Search for this email in ${gmailAccounts.find(a => a._id === event.sourceGmailAccountId)?.gmailEmail || 'Gmail'}. Make sure you're signed into ${gmailAccounts.find(a => a._id === event.sourceGmailAccountId)?.gmailEmail || 'the correct account'} in Gmail first.`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Search in Gmail
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons - Visual Hierarchy */}
                  <div className="space-y-3">
                    {/* Primary Action: Approve - BIG and GREEN */}
                    <button
                      onClick={() => handleApprove(event._id)}
                      className="w-full px-6 py-5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold text-lg shadow-medium hover:shadow-strong transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
                    >
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Looks Good! Add to Calendar</span>
                    </button>

                    {/* Secondary Actions - Smaller */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(event)}
                        className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Details
                      </button>
                      <button
                        onClick={() => handleReject(event._id)}
                        className="flex-1 px-4 py-3 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Not This One
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>

            {/* Pagination Controls */}
            {unconfirmedEvents.length > eventsPerPage && (() => {
              const totalPages = Math.ceil(unconfirmedEvents.length / eventsPerPage);
              return (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg mt-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * eventsPerPage + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * eventsPerPage, unconfirmedEvents.length)}</span> of{' '}
                        <span className="font-medium">{unconfirmedEvents.length}</span> events
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {[...Array(totalPages)].map((_, i) => {
                          const pageNum = i + 1;
                          // Show first page, last page, current page, and pages around current
                          const showPage = pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1;
                          const showEllipsis = (pageNum === 2 && currentPage > 3) || (pageNum === totalPages - 1 && currentPage < totalPages - 2);

                          if (showEllipsis) {
                            return (
                              <span key={i} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                ...
                              </span>
                            );
                          }

                          if (!showPage) return null;

                          return (
                            <button
                              key={i}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                currentPage === pageNum
                                  ? 'z-10 bg-primary-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                                  : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Edit Event Modal */}
      {showEditEventModal && editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
              <button
                onClick={() => {
                  setShowEditEventModal(false);
                  setEditingEvent(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                aria-label="Close edit modal"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingEvent.title}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    defaultValue={editingEvent.eventDate}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Family Members</label>
                  <div className="space-y-2 p-3 border border-gray-300 rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                    {familyMembers && familyMembers.length > 0 ? (
                      [...familyMembers].sort((a, b) => a.name.localeCompare(b.name)).map((member) => {
                        const selectedMembers = editingEvent.childName ? editingEvent.childName.split(", ") : [];
                        const isChecked = selectedMembers.includes(member.name);

                        return (
                          <label key={member._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                            <input
                              type="checkbox"
                              name="familyMembers"
                              value={member.name}
                              defaultChecked={isChecked}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="eventTime"
                      defaultValue={editingEvent.eventTime || ""}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      defaultValue={editingEvent.endTime || ""}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={editingEvent.location || ""}
                    placeholder="e.g., West Field"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue={editingEvent.category || ""}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        const customCategory = prompt("Enter custom category:");
                        if (customCategory && customCategory.trim()) {
                          e.target.value = customCategory.trim();
                          // Update editingEvent so the value persists
                          setEditingEvent({ ...editingEvent, category: customCategory.trim() });
                        } else {
                          e.target.value = editingEvent.category || "";
                        }
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingEvent.description || ""}
                    rows={3}
                    placeholder="Any additional details..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  ></textarea>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition">
                    <input
                      type="checkbox"
                      name="requiresAction"
                      defaultChecked={editingEvent.requiresAction || false}
                      onChange={(e) => {
                        const actionFields = document.getElementById('edit-action-fields');
                        if (actionFields) {
                          actionFields.style.display = e.target.checked ? 'block' : 'none';
                        }
                      }}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">This event requires action (RSVP, payment, etc.)</span>
                      <p className="text-sm text-gray-600">Check this if you need to RSVP, pay, or take other action</p>
                    </div>
                  </label>

                  <div
                    id="edit-action-fields"
                    style={{ display: editingEvent.requiresAction ? 'block' : 'none' }}
                    className="ml-8 mt-3 space-y-3"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Action Deadline (Optional)
                      </label>
                      <input
                        type="date"
                        name="actionDeadline"
                        defaultValue={editingEvent.actionDeadline || ""}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        What action is needed? (Optional)
                      </label>
                      <input
                        type="text"
                        name="actionDescription"
                        defaultValue={editingEvent.actionDescription || ""}
                        placeholder="e.g., RSVP by email, Pay $50, Sign permission slip"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition">
                        <input
                          type="checkbox"
                          name="actionCompleted"
                          defaultChecked={editingEvent.actionCompleted || false}
                          className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900">✓ Action completed</span>
                          <p className="text-xs text-gray-600">Check this when you've completed the RSVP, payment, or other action</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Recurring Event Settings */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition">
                    <input
                      type="checkbox"
                      name="isRecurring"
                      defaultChecked={editingEvent.isRecurring || false}
                      onChange={(e) => {
                        const recurringFields = document.getElementById('edit-recurring-fields');
                        if (recurringFields) {
                          recurringFields.style.display = e.target.checked ? 'block' : 'none';
                        }
                      }}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">This is a recurring event</span>
                      <p className="text-sm text-gray-600">Repeats weekly, monthly, or on a custom schedule</p>
                    </div>
                  </label>

                  <div
                    id="edit-recurring-fields"
                    style={{ display: editingEvent.isRecurring ? 'block' : 'none' }}
                    className="ml-8 mt-3 space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Repeats
                        </label>
                        <select
                          name="recurrencePattern"
                          defaultValue={editingEvent.recurrencePattern || "weekly"}
                          onChange={(e) => {
                            const weeklyDays = document.getElementById('edit-weekly-days');
                            if (weeklyDays) {
                              weeklyDays.style.display = e.target.value === 'weekly' ? 'block' : 'none';
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Every
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            name="recurrenceInterval"
                            min="1"
                            max="99"
                            defaultValue={editingEvent.recurrenceInterval || 1}
                            className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-600">
                            {editingEvent.recurrencePattern === 'daily' ? 'day(s)' :
                             editingEvent.recurrencePattern === 'weekly' ? 'week(s)' :
                             editingEvent.recurrencePattern === 'monthly' ? 'month(s)' :
                             editingEvent.recurrencePattern === 'yearly' ? 'year(s)' : 'week(s)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      id="edit-weekly-days"
                      style={{ display: (editingEvent.recurrencePattern === 'weekly' || !editingEvent.recurrencePattern) ? 'block' : 'none' }}
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Repeat on
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                          const isChecked = editingEvent.recurrenceDaysOfWeek?.includes(day) || false;
                          return (
                            <label key={day} className="flex flex-col items-center">
                              <input
                                type="checkbox"
                                name="recurrenceDaysOfWeek"
                                value={day}
                                defaultChecked={isChecked}
                                className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 mb-1"
                              />
                              <span className="text-xs text-gray-600">{day.slice(0, 3)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ends
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="recurrenceEndType"
                            value="never"
                            defaultChecked={editingEvent.recurrenceEndType === 'never' || !editingEvent.recurrenceEndType}
                            onChange={() => {
                              const endDateField = document.getElementById('edit-recurrence-end-date');
                              const endCountField = document.getElementById('edit-recurrence-end-count');
                              if (endDateField) endDateField.style.display = 'none';
                              if (endCountField) endCountField.style.display = 'none';
                            }}
                            className="w-4 h-4 text-primary-600 focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">Never</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="recurrenceEndType"
                            value="date"
                            defaultChecked={editingEvent.recurrenceEndType === 'date'}
                            onChange={() => {
                              const endDateField = document.getElementById('edit-recurrence-end-date');
                              const endCountField = document.getElementById('edit-recurrence-end-count');
                              if (endDateField) endDateField.style.display = 'block';
                              if (endCountField) endCountField.style.display = 'none';
                            }}
                            className="w-4 h-4 text-primary-600 focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">On date</span>
                        </label>

                        <div
                          id="edit-recurrence-end-date"
                          style={{ display: editingEvent.recurrenceEndType === 'date' ? 'block' : 'none' }}
                          className="ml-6"
                        >
                          <input
                            type="date"
                            name="recurrenceEndDate"
                            defaultValue={editingEvent.recurrenceEndDate || ""}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="recurrenceEndType"
                            value="count"
                            defaultChecked={editingEvent.recurrenceEndType === 'count'}
                            onChange={() => {
                              const endDateField = document.getElementById('edit-recurrence-end-date');
                              const endCountField = document.getElementById('edit-recurrence-end-count');
                              if (endDateField) endDateField.style.display = 'none';
                              if (endCountField) endCountField.style.display = 'block';
                            }}
                            className="w-4 h-4 text-primary-600 focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">After</span>
                        </label>

                        <div
                          id="edit-recurrence-end-count"
                          style={{ display: editingEvent.recurrenceEndType === 'count' ? 'block' : 'none' }}
                          className="ml-6 flex items-center gap-2"
                        >
                          <input
                            type="number"
                            name="recurrenceEndCount"
                            min="1"
                            max="365"
                            defaultValue={editingEvent.recurrenceEndCount || 10}
                            className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-600">occurrences</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleEnhanceEditEvent}
                    disabled={isEnhancingEvent || !editingEvent?.title?.trim()}
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
                        ✨ Enhance
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditEventModal(false);
                      setEditingEvent(null);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
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

      {/* Paste Text Modal */}
      {showPasteTextModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowPasteTextModal(false);
            setPastedText("");
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-primary-400 to-primary-500 rounded-t-2xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Paste Text</h2>
                  <p className="text-white/90 text-sm">Paste an email, text message, or any text with event details</p>
                </div>
                <button
                  onClick={() => {
                    setShowPasteTextModal(false);
                    setPastedText("");
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                  aria-label="Close paste text modal"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-primary-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-primary-800 mb-1">How it works</h4>
                    <p className="text-sm text-primary-700">
                      Our AI will automatically extract event details including dates, times, locations, and even which family members are attending!
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste your text here
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Example:
Soccer practice this Saturday at 9am at Memorial Park. I'm taking Emma and Sara. Please bring water and shin guards!"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleExtractFromPaste();
                    setShowPasteTextModal(false);
                  }}
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
                    setShowPasteTextModal(false);
                    setPastedText("");
                  }}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
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
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-white">Add New Event</h2>
                <button
                  onClick={() => {
                    setShowAddEventModal(false);
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

            {/* Manual Entry Form */}
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

                {/* Recurring Event Settings */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={newEventForm.isRecurring}
                      onChange={(e) => setNewEventForm({
                        ...newEventForm,
                        isRecurring: e.target.checked
                      })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 mt-0.5"
                    />
                    <label htmlFor="isRecurring" className="flex-1 cursor-pointer">
                      <span className="block text-sm font-semibold text-gray-900">
                        This is a recurring event
                      </span>
                      <span className="block text-xs text-gray-600 mt-0.5">
                        Repeats weekly, monthly, or on a custom schedule
                      </span>
                    </label>
                  </div>

                  {newEventForm.isRecurring && (
                    <div className="space-y-4 pl-8">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Repeats</label>
                          <select
                            value={newEventForm.recurrencePattern}
                            onChange={(e) => setNewEventForm({
                              ...newEventForm,
                              recurrencePattern: e.target.value as any
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Every</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={newEventForm.recurrenceInterval}
                              onChange={(e) => setNewEventForm({
                                ...newEventForm,
                                recurrenceInterval: parseInt(e.target.value) || 1
                              })}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <span className="text-sm text-gray-600">
                              {newEventForm.recurrencePattern === 'daily' ? 'day(s)' :
                               newEventForm.recurrencePattern === 'weekly' ? 'week(s)' :
                               newEventForm.recurrencePattern === 'monthly' ? 'month(s)' :
                               'year(s)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {newEventForm.recurrencePattern === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Repeat on</label>
                          <div className="grid grid-cols-7 gap-2">
                            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                              <label key={day} className="flex flex-col items-center">
                                <input
                                  type="checkbox"
                                  checked={newEventForm.recurrenceDaysOfWeek.includes(day)}
                                  onChange={(e) => {
                                    const days = e.target.checked
                                      ? [...newEventForm.recurrenceDaysOfWeek, day]
                                      : newEventForm.recurrenceDaysOfWeek.filter(d => d !== day);
                                    setNewEventForm({
                                      ...newEventForm,
                                      recurrenceDaysOfWeek: days
                                    });
                                  }}
                                  className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 mb-1"
                                />
                                <span className="text-xs text-gray-600">{day.slice(0, 3)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ends</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="recurrenceEndType"
                              value="never"
                              checked={newEventForm.recurrenceEndType === 'never'}
                              onChange={(e) => setNewEventForm({
                                ...newEventForm,
                                recurrenceEndType: 'never'
                              })}
                              className="w-4 h-4 text-primary-600 focus:ring-2 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">Never</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="recurrenceEndType"
                              value="date"
                              checked={newEventForm.recurrenceEndType === 'date'}
                              onChange={(e) => setNewEventForm({
                                ...newEventForm,
                                recurrenceEndType: 'date'
                              })}
                              className="w-4 h-4 text-primary-600 focus:ring-2 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">On date</span>
                          </label>

                          {newEventForm.recurrenceEndType === 'date' && (
                            <div className="ml-6">
                              <input
                                type="date"
                                value={newEventForm.recurrenceEndDate}
                                onChange={(e) => setNewEventForm({
                                  ...newEventForm,
                                  recurrenceEndDate: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          )}

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="recurrenceEndType"
                              value="count"
                              checked={newEventForm.recurrenceEndType === 'count'}
                              onChange={(e) => setNewEventForm({
                                ...newEventForm,
                                recurrenceEndType: 'count'
                              })}
                              className="w-4 h-4 text-primary-600 focus:ring-2 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">After</span>
                          </label>

                          {newEventForm.recurrenceEndType === 'count' && (
                            <div className="ml-6 flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="365"
                                value={newEventForm.recurrenceEndCount}
                                onChange={(e) => setNewEventForm({
                                  ...newEventForm,
                                  recurrenceEndCount: parseInt(e.target.value) || 10
                                })}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                              <span className="text-sm text-gray-600">occurrences</span>
                            </div>
                          )}
                        </div>
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
                  onClick={handleEnhanceEvent}
                  disabled={isEnhancingEvent || !newEventForm.title.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition shadow-soft flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  Cancel
                </button>
              </div>
            </form>
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
                              <div>📅 {new Date(event.eventDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                              {event.eventTime && <div>🕐 {formatTime12Hour(event.eventTime)}{event.endTime && ` - ${formatTime12Hour(event.endTime)}`}</div>}
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
                                await createUnconfirmedEvent({
                                  familyId: convexUser!.familyId,
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
                                  sourceEmailSubject: event.sourceEmailSubject || undefined,
                                });
                                showToast(`✓ Added "${event.title}" - scroll down to review and edit details!`, "success");
                                // Remove from search results
                                setEmailSearchResults(prev => prev.filter((_, i) => i !== idx));
                              } catch (error) {
                                console.error("Error adding event:", error);
                                showToast("Failed to add event", "error");
                              }
                            }}
                            className="ml-4 px-4 py-2 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 transition text-sm whitespace-nowrap"
                          >
                            + Add to Review
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

      {/* Undo Notification */}
      {recentlyDismissed && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 z-50 animate-slide-up">
          <span className="text-sm font-medium">Event dismissed</span>
          <button
            onClick={handleUndoDismiss}
            className="px-4 py-1 bg-white text-gray-900 rounded-md hover:bg-gray-100 transition font-semibold text-sm"
          >
            Undo
          </button>
        </div>
      )}

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
}
