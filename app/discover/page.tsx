"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "../components/Toast";
import MobileNav from "../components/MobileNav";
import BottomNav from "../components/BottomNav";
import FAB from "../components/FAB";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingSpinner, { ButtonSpinner } from "../components/LoadingSpinner";
import PhotoUploadModal from "../components/PhotoUploadModal";
import VoiceRecordModal from "../components/VoiceRecordModal";

export default function DiscoverPage() {
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "event" | "place">("all"); // NEW: filter by type
  const [searchKeyword, setSearchKeyword] = useState("");
  const [discoveryKeyword, setDiscoveryKeyword] = useState(""); // Keyword for AI discovery
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false); // For mobile collapsible filters
  const [discoveryMessage, setDiscoveryMessage] = useState("");
  const [discoveryProgress, setDiscoveryProgress] = useState("");
  const [location, setLocation] = useState("");
  const [distance, setDistance] = useState(15); // Default 15 miles
  const [startDate, setStartDate] = useState(() => {
    // Default to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to 30 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    return futureDate.toISOString().split('T')[0];
  });
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [showVoiceRecordModal, setShowVoiceRecordModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showPasteTextModal, setShowPasteTextModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isExtractingEvent, setIsExtractingEvent] = useState(false);
  const [conversationalInput, setConversationalInput] = useState("");
  const [isParsingConversational, setIsParsingConversational] = useState(false);
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

  // Get current user from Convex
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Get family data for saved location
  const family = useQuery(
    api.families.getFamilyById,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get Gmail accounts to show search email option in FAB
  const gmailAccounts = useQuery(
    api.gmailAccounts.getFamilyGmailAccounts,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get suggested activities from database
  const dbActivities = useQuery(
    api.suggestedActivities.getSuggestedActivitiesByFamily,
    convexUser?.familyId ? { familyId: convexUser.familyId, status: "suggested" } : "skip"
  );

  // Get family members for the event form
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

  // Mutations for activity actions
  const quickAddToCalendar = useMutation(api.suggestedActivities.quickAddToCalendar);
  const dismissActivity = useMutation(api.suggestedActivities.dismissActivity);
  const updateFamilyLocation = useMutation(api.families.updateFamilyLocation);

  // Mutations for events
  const createEvent = useMutation(api.events.createEvent);
  const createUnconfirmedEvent = useMutation(api.events.createUnconfirmedEvent);
  const addCustomCategory = useMutation(api.families.addCustomCategory);

  // Action to trigger discovery
  const discoverActivities = useAction(api.discover.discoverActivitiesForFamily);

  // Load saved family location on mount
  useEffect(() => {
    if (family?.location && !location) {
      setLocation(family.location);
    }
  }, [family]);

  const handleDiscoverActivities = async () => {
    if (!convexUser?.familyId) return;

    if (!location.trim()) {
      showToast("Please enter your city or zip code", "error");
      return;
    }

    setIsDiscovering(true);
    setDiscoveryProgress("");
    setDiscoveryMessage("🔍 Discovering activities in your area...");

    try {
      console.log("[Discover] Starting discovery for:", location, "within", distance, "miles", "from", startDate, "to", endDate, discoveryKeyword ? `searching for: ${discoveryKeyword}` : "");
      const result = await discoverActivities({
        familyId: convexUser.familyId,
        userLocation: location,
        distance: distance,
        startDate: startDate,
        endDate: endDate,
        searchKeyword: discoveryKeyword || undefined,
        apiBaseUrl: window.location.origin, // Pass current site URL to Convex action
      });

      console.log("[Discover] Discovery completed:", result);

      // Save the location to family record for future use
      await updateFamilyLocation({
        familyId: convexUser.familyId,
        location: location.trim(),
      });

      setDiscoveryProgress("");
      setDiscoveryMessage(
        `✅ Success! Found ${result.activitiesDiscovered} new recommendations from ${result.eventsScraped} events.`
      );
      showToast(
        `Found ${result.activitiesDiscovered} activities in your area!`,
        "success"
      );
    } catch (error: any) {
      console.error("[Discover] Error during discovery:", error);
      setDiscoveryProgress("");
      setDiscoveryMessage(`❌ Error: ${error.message || "Unknown error occurred"}`);
      showToast(
        error.message || "Could not find activities. Please try again.",
        "error"
      );
    } finally {
      setIsDiscovering(false);
      setTimeout(() => {
        setDiscoveryMessage("");
        setDiscoveryProgress("");
      }, 8000);
    }
  };

  const handleAddToCalendar = async (activityId: any) => {
    if (!convexUser?._id) return;
    try {
      await quickAddToCalendar({
        activityId,
        userId: convexUser._id
      });
      showToast("Activity added to calendar!", "success");
    } catch (error: any) {
      console.error("Error adding to calendar:", error);
      showToast("Failed to add to calendar. Please try again.", "error");
    }
  };

  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    setEditForm({
      title: activity.title || '',
      date: activity.date || '',
      time: activity.time || '',
      endTime: activity.endTime || '',
      location: activity.location || '',
      description: activity.description || '',
      category: activity.category || '',
    });
  };

  const handleSaveAndAdd = async () => {
    if (!convexUser?._id || !editingActivity) return;
    // For now, we'll just add the original activity
    // In a full implementation, you'd update the activity first
    try {
      await quickAddToCalendar({
        activityId: editingActivity._id,
        userId: convexUser._id
      });
      showToast("Activity added to calendar!", "success");
      setEditingActivity(null);
      setEditForm({});
    } catch (error: any) {
      console.error("Error adding to calendar:", error);
      showToast("Failed to add to calendar. Please try again.", "error");
    }
  };

  const handleDismiss = async (activityId: any) => {
    try {
      await dismissActivity({ activityId });
      showToast("Activity dismissed", "info");
    } catch (error: any) {
      console.error("Error dismissing activity:", error);
      showToast("Failed to dismiss activity. Please try again.", "error");
    }
  };

  const handleFABAction = (action: "manual" | "paste" | "photo" | "voice") => {
    switch (action) {
      case "manual":
        setShowAddEventModal(true);
        break;
      case "paste":
        setShowPasteTextModal(true);
        break;
      case "photo":
        setShowPhotoUploadModal(true);
        break;
      case "voice":
        setShowVoiceRecordModal(true);
        break;
    }
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

      if (!data.hasEvents || !data.events || data.events.length === 0) {
        showToast("No event details found in the text. Please try again.", "error");
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
        setShowPasteTextModal(false);
        setPastedText("");
        showToast(`✓ Found ${data.events.length} events! Review them in your inbox.`, "success");
      } else {
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
          isRecurring: false,
          recurrencePattern: "weekly" as "daily" | "weekly" | "monthly" | "yearly",
          recurrenceInterval: 1,
          recurrenceDaysOfWeek: [] as string[],
          recurrenceEndType: "never" as "never" | "date" | "count",
          recurrenceEndDate: "",
          recurrenceEndCount: 10,
        });
        setShowPasteTextModal(false);
        setShowAddEventModal(true);
        showToast("Event details extracted! Review and save below.", "success");
      }
    } catch (error) {
      console.error("Error extracting event:", error);
      showToast("Failed to extract event details. Please try again.", "error");
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

      const event = data.events[0];

      const categoryMap: {[key: string]: string} = {
        "sports": "Sports",
        "arts": "Lessons",
        "education": "School",
        "entertainment": "Other",
        "family": "Other",
        "other": "Other"
      };

      setNewEventForm({
        ...newEventForm,
        title: event.title || "",
        eventDate: event.date || "",
        eventTime: event.time || "",
        endTime: event.endTime || "",
        location: event.location || "",
        category: categoryMap[event.category] || event.category || "Other",
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

      showToast("✨ AI filled the form! Review and click Save when ready.", "success");
      setConversationalInput("");
    } catch (error: any) {
      console.error("Error parsing conversational input:", error);
      showToast("Failed to parse your description. Please try again or fill manually.", "error");
    } finally {
      setIsParsingConversational(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!convexUser?._id || !convexUser?.familyId) {
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
      if (newEventForm.category && allCategories) {
        const isDefaultCategory = allCategories.defaultCategories.includes(newEventForm.category);
        const isExistingCustom = allCategories.customCategories.includes(newEventForm.category);

        if (!isDefaultCategory && !isExistingCustom) {
          await addCustomCategory({
            familyId: convexUser.familyId,
            category: newEventForm.category,
          });
        }
      }

      await createEvent({
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
        isRecurring: newEventForm.isRecurring || false,
        recurrencePattern: newEventForm.isRecurring ? newEventForm.recurrencePattern : undefined,
        recurrenceInterval: newEventForm.isRecurring ? newEventForm.recurrenceInterval : undefined,
        recurrenceDaysOfWeek: newEventForm.isRecurring && newEventForm.recurrenceDaysOfWeek.length > 0 ? newEventForm.recurrenceDaysOfWeek as ("Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday")[] : undefined,
        recurrenceEndType: newEventForm.isRecurring ? newEventForm.recurrenceEndType : undefined,
        recurrenceEndDate: newEventForm.isRecurring && newEventForm.recurrenceEndType === "date" ? newEventForm.recurrenceEndDate : undefined,
        recurrenceEndCount: newEventForm.isRecurring && newEventForm.recurrenceEndType === "count" ? newEventForm.recurrenceEndCount : undefined,
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
        recurrencePattern: "weekly",
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: [],
        recurrenceEndType: "never",
        recurrenceEndDate: "",
        recurrenceEndCount: 10,
      });

      setShowAddEventModal(false);
      showToast("Event added to calendar!", "success");
    } catch (error: any) {
      console.error("Error creating event:", error);
      showToast("Failed to create event. Please try again.", "error");
    }
  };

  // Use database activities or empty array
  const suggestedActivities = dbActivities || [];

  // Debug logging
  console.log("[Discover] Current user:", convexUser);
  console.log("[Discover] Suggested activities from DB:", suggestedActivities.length, "activities");

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "sports": "bg-blue-100 text-blue-800",
      "Sports": "bg-blue-100 text-blue-800",
      "arts": "bg-purple-100 text-purple-800",
      "Arts & Crafts": "bg-purple-100 text-purple-800",
      "education": "bg-green-100 text-green-800",
      "Education": "bg-green-100 text-green-800",
      "entertainment": "bg-pink-100 text-pink-800",
      "Entertainment": "bg-pink-100 text-pink-800",
      "community": "bg-yellow-100 text-yellow-800",
      "recreation": "bg-cyan-100 text-cyan-800",
      "family": "bg-rose-100 text-rose-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getPriceLabel = (priceRange?: string) => {
    if (!priceRange) return "Price not listed";
    const labels: { [key: string]: string } = {
      "Free": "Free",
      "$": "Under $25",
      "$$": "$25-75",
      "$$$": "$75+",
    };
    return labels[priceRange] || priceRange;
  };

  // Get unique categories from actual activities
  const uniqueCategories = Array.from(
    new Set(
      suggestedActivities
        .map(activity => activity.category)
        .filter(Boolean) as string[]
    )
  ).sort();

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
              <Link href="/calendar" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                Calendar
              </Link>
              <Link href="/review" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                Events
              </Link>
              <Link href="/discover" className="text-sm font-medium text-primary-600 transition">
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
        currentPage="discover"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Simplified Search Hero */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 sm:p-8 text-white mb-8 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            What are you looking for?
          </h1>
          <p className="text-purple-50 mb-6 text-lg">
            Search local parks, museums, classes, and events for your family
          </p>

          {/* Single Search Input */}
          <div className="space-y-4">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter your city or ZIP code"
              className="w-full px-5 py-4 rounded-xl text-gray-900 text-lg font-medium placeholder-gray-500 focus:ring-4 focus:ring-purple-300 focus:outline-none"
            />

            <button
              onClick={handleDiscoverActivities}
              disabled={isDiscovering || !location}
              className="w-full px-6 py-4 bg-white text-purple-600 rounded-xl font-bold text-lg hover:bg-purple-50 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] flex items-center justify-center gap-2"
            >
              {isDiscovering ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                "🔍 Search Near Me"
              )}
            </button>

            {/* Advanced Options - Collapsed by default */}
            <button
              type="button"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="text-sm text-white/80 hover:text-white underline min-h-[44px] w-full text-center transition"
            >
              {filtersExpanded ? "Hide" : "Show"} Advanced Options
            </button>

            {filtersExpanded && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-4 border border-white/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Search Radius
                    </label>
                    <select
                      value={distance}
                      onChange={(e) => setDistance(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-white"
                    >
                      <option value={5}>5 miles</option>
                      <option value={10}>10 miles</option>
                      <option value={15}>15 miles</option>
                      <option value={20}>20 miles</option>
                      <option value={25}>25 miles</option>
                      <option value={30}>30 miles</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Keyword (optional)
                    </label>
                    <input
                      type="text"
                      value={discoveryKeyword}
                      onChange={(e) => setDiscoveryKeyword(e.target.value)}
                      placeholder="Try: soccer classes, art museums, summer camps"
                      className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {discoveryMessage && (
              <div className={`p-4 rounded-xl border-2 ${
                discoveryMessage.includes('Success')
                  ? 'bg-green-500/20 border-green-300 text-white'
                  : discoveryMessage.includes('Error')
                  ? 'bg-red-500/20 border-red-300 text-white'
                  : 'bg-blue-500/20 border-blue-300 text-white'
              }`}>
                <p className="font-medium">{discoveryMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Pills Filter - Only show when there are activities */}
        {suggestedActivities.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium min-h-[44px] transition-all ${
                  filter === "all"
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({suggestedActivities.length})
              </button>
              {uniqueCategories.map((cat) => {
                const count = suggestedActivities.filter(a => a.category?.toLowerCase() === cat?.toLowerCase()).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat?.toLowerCase())}
                    className={`px-4 py-2 rounded-full whitespace-nowrap font-medium min-h-[44px] transition-all ${
                      filter === cat?.toLowerCase()
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Bar - Only show when there are activities */}
        {suggestedActivities.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search activities..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] px-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Activity Cards */}
        {suggestedActivities.length > 0 ? (
          (() => {
            const filteredActivities = suggestedActivities.filter(activity => {
              // Filter by category
              const matchesCategory = filter === "all" || activity.category?.toLowerCase() === filter;

              // Filter by search keyword
              const matchesSearch = !searchKeyword ||
                activity.title?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                activity.description?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                activity.category?.toLowerCase().includes(searchKeyword.toLowerCase());

              return matchesCategory && matchesSearch;
            });

            // Show empty state if filter returns no results
            if (filteredActivities.length === 0) {
              return (
                <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center">
                  <div className="text-7xl mb-6">🤷‍♀️</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    No activities found
                    {searchKeyword && ` for "${searchKeyword}"`}
                    {filter !== "all" && ` in ${filter}`}
                  </h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Try removing some filters to see more activities.
                  </p>
                  <div className="flex gap-4 justify-center flex-wrap">
                    {searchKeyword && (
                      <button
                        onClick={() => setSearchKeyword("")}
                        className="px-8 py-4 bg-gray-600 text-white rounded-xl text-lg font-bold hover:bg-gray-700 transition-all shadow-md"
                      >
                        Clear Search
                      </button>
                    )}
                    {filter !== "all" && (
                      <button
                        onClick={() => setFilter("all")}
                        className="px-8 py-4 bg-green-600 text-white rounded-xl text-lg font-bold hover:bg-green-700 transition-all shadow-md"
                      >
                        Show All Categories
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // Helper function to get emoji for category
            const getCategoryEmoji = (category: string) => {
              const emojiMap: { [key: string]: string } = {
                'sports': '⚽',
                'arts': '🎨',
                'arts & crafts': '🎨',
                'education': '📚',
                'entertainment': '🎭',
                'community': '🏘️',
                'recreation': '🎪',
                'family': '👨‍👩‍👧‍👦',
                'music': '🎵',
                'dance': '💃',
                'other': '✨',
              };
              return emojiMap[category?.toLowerCase()] || '✨';
            };

            return (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredActivities.map((activity) => (
                <div key={activity._id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200">
                  <div className="p-5">
                    {/* Essential Info with Big Emoji */}
                    <div className="flex gap-3 mb-4">
                      <div className="text-5xl flex-shrink-0">
                        {getCategoryEmoji(activity.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                          {activity.title}
                        </h3>
                        <div className="text-sm space-y-1 text-gray-700">
                          {/* Show date for events, hours for places */}
                          {activity.type === 'event' && activity.date && (
                            <div className="flex items-center gap-1">
                              <span>📅</span>
                              <span>
                                {new Date(activity.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                                {activity.time && ` at ${(() => {
                                  const [hours, minutes] = activity.time.split(':');
                                  const hour = parseInt(hours);
                                  const ampm = hour >= 12 ? 'PM' : 'AM';
                                  const displayHour = hour % 12 || 12;
                                  return `${displayHour}:${minutes} ${ampm}`;
                                })()}`}
                              </span>
                            </div>
                          )}
                          {activity.type === 'place' && activity.hoursOfOperation && (
                            <div className="flex items-center gap-1">
                              <span>🕐</span>
                              <span>{activity.hoursOfOperation}</span>
                            </div>
                          )}
                          {activity.location && (
                            <div className="flex items-center gap-1">
                              <span>📍</span>
                              <span className="truncate">{activity.location}</span>
                            </div>
                          )}
                          {(activity.priceRange || activity.admission) && (
                            <div className="flex items-center gap-1">
                              <span>💰</span>
                              <span>{activity.admission || getPriceLabel(activity.priceRange)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Single Big Action */}
                    <button
                      onClick={() => handleAddToCalendar(activity._id)}
                      className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-md min-h-[56px]"
                    >
                      Add to Calendar
                    </button>

                    {/* Secondary Actions as Text Links */}
                    <div className="mt-3 flex justify-between text-sm">
                      <button
                        onClick={() => handleEditActivity(activity)}
                        className="text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-3"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDismiss(activity._id)}
                        className="text-gray-500 hover:text-gray-700 font-medium min-h-[44px] px-3"
                      >
                        Not Interested
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            );
          })()
        ) : (
          /* Empty State - Interactive Examples */
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
            <div className="p-8 sm:p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                Find Activities Your Kids Will Love
              </h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Search for classes, events, and places near you - or try one of these popular searches:
              </p>

              {/* Interactive Example Searches */}
              <div className="space-y-3 max-w-md mx-auto mb-8">
                <button
                  onClick={async () => {
                    if (!location) {
                      showToast("Please enter your location first", "info");
                      return;
                    }
                    const originalKeyword = discoveryKeyword;
                    setDiscoveryKeyword("youth soccer");
                    setIsDiscovering(true);
                    setDiscoveryProgress("");
                    setDiscoveryMessage("🔍 Discovering activities in your area...");

                    try {
                      const result = await discoverActivities({
                        familyId: convexUser!.familyId,
                        userLocation: location,
                        distance: distance,
                        startDate: startDate,
                        endDate: endDate,
                        searchKeyword: "youth soccer",
                        apiBaseUrl: window.location.origin,
                      });

                      await updateFamilyLocation({
                        familyId: convexUser!.familyId,
                        location: location.trim(),
                      });

                      setDiscoveryProgress("");
                      setDiscoveryMessage(`✅ Success! Found ${result.activitiesDiscovered} new recommendations from ${result.eventsScraped} events.`);
                      showToast(`Found ${result.activitiesDiscovered} activities in your area!`, "success");
                      setDiscoveryKeyword(originalKeyword); // Reset to original
                    } catch (error: any) {
                      setDiscoveryProgress("");
                      setDiscoveryMessage(`❌ Error: ${error.message || "Unknown error occurred"}`);
                      showToast(error.message || "Could not find activities. Please try again.", "error");
                      setDiscoveryKeyword(originalKeyword); // Reset to original
                    } finally {
                      setIsDiscovering(false);
                      setTimeout(() => {
                        setDiscoveryMessage("");
                        setDiscoveryProgress("");
                      }, 8000);
                    }
                  }}
                  className="w-full p-4 bg-blue-50 rounded-xl text-left hover:bg-blue-100 transition min-h-[56px] flex items-center gap-3 border-2 border-transparent hover:border-blue-300"
                >
                  <span className="text-3xl">⚽</span>
                  <span className="font-semibold text-gray-900">Youth Soccer Leagues</span>
                </button>
                <button
                  onClick={async () => {
                    if (!location) {
                      showToast("Please enter your location first", "info");
                      return;
                    }
                    const originalKeyword = discoveryKeyword;
                    setDiscoveryKeyword("art classes");
                    setIsDiscovering(true);
                    setDiscoveryProgress("");
                    setDiscoveryMessage("🔍 Discovering activities in your area...");

                    try {
                      const result = await discoverActivities({
                        familyId: convexUser!.familyId,
                        userLocation: location,
                        distance: distance,
                        startDate: startDate,
                        endDate: endDate,
                        searchKeyword: "art classes",
                        apiBaseUrl: window.location.origin,
                      });

                      await updateFamilyLocation({
                        familyId: convexUser!.familyId,
                        location: location.trim(),
                      });

                      setDiscoveryProgress("");
                      setDiscoveryMessage(`✅ Success! Found ${result.activitiesDiscovered} new recommendations from ${result.eventsScraped} events.`);
                      showToast(`Found ${result.activitiesDiscovered} activities in your area!`, "success");
                      setDiscoveryKeyword(originalKeyword); // Reset to original
                    } catch (error: any) {
                      setDiscoveryProgress("");
                      setDiscoveryMessage(`❌ Error: ${error.message || "Unknown error occurred"}`);
                      showToast(error.message || "Could not find activities. Please try again.", "error");
                      setDiscoveryKeyword(originalKeyword); // Reset to original
                    } finally {
                      setIsDiscovering(false);
                      setTimeout(() => {
                        setDiscoveryMessage("");
                        setDiscoveryProgress("");
                      }, 8000);
                    }
                  }}
                  className="w-full p-4 bg-purple-50 rounded-xl text-left hover:bg-purple-100 transition min-h-[56px] flex items-center gap-3 border-2 border-transparent hover:border-purple-300"
                >
                  <span className="text-3xl">🎨</span>
                  <span className="font-semibold text-gray-900">Art Classes for Kids</span>
                </button>
                <button
                  onClick={async () => {
                    if (!location) {
                      showToast("Please enter your location first", "info");
                      return;
                    }
                    const originalKeyword = discoveryKeyword;
                    setDiscoveryKeyword("summer camps");
                    setIsDiscovering(true);
                    setDiscoveryProgress("");
                    setDiscoveryMessage("🔍 Discovering activities in your area...");

                    try {
                      const result = await discoverActivities({
                        familyId: convexUser!.familyId,
                        userLocation: location,
                        distance: distance,
                        startDate: startDate,
                        endDate: endDate,
                        searchKeyword: "summer camps",
                        apiBaseUrl: window.location.origin,
                      });

                      await updateFamilyLocation({
                        familyId: convexUser!.familyId,
                        location: location.trim(),
                      });

                      setDiscoveryProgress("");
                      setDiscoveryMessage(`✅ Success! Found ${result.activitiesDiscovered} new recommendations from ${result.eventsScraped} events.`);
                      showToast(`Found ${result.activitiesDiscovered} activities in your area!`, "success");
                      setDiscoveryKeyword(originalKeyword); // Reset to original
                    } catch (error: any) {
                      setDiscoveryProgress("");
                      setDiscoveryMessage(`❌ Error: ${error.message || "Unknown error occurred"}`);
                      showToast(error.message || "Could not find activities. Please try again.", "error");
                      setDiscoveryKeyword(originalKeyword); // Reset to original
                    } finally {
                      setIsDiscovering(false);
                      setTimeout(() => {
                        setDiscoveryMessage("");
                        setDiscoveryProgress("");
                      }, 8000);
                    }
                  }}
                  className="w-full p-4 bg-green-50 rounded-xl text-left hover:bg-green-100 transition min-h-[56px] flex items-center gap-3 border-2 border-transparent hover:border-green-300"
                >
                  <span className="text-3xl">🏕️</span>
                  <span className="font-semibold text-gray-900">Summer Camps</span>
                </button>
                <button
                  onClick={async () => {
                    if (!location) {
                      showToast("Please enter your location first", "info");
                      return;
                    }
                    const originalKeyword = discoveryKeyword;
                    setDiscoveryKeyword("music lessons");
                    setIsDiscovering(true);
                    setDiscoveryProgress("");
                    setDiscoveryMessage("🔍 Discovering activities in your area...");

                    try {
                      const result = await discoverActivities({
                        familyId: convexUser!.familyId,
                        userLocation: location,
                        distance: distance,
                        startDate: startDate,
                        endDate: endDate,
                        searchKeyword: "music lessons",
                        apiBaseUrl: window.location.origin,
                      });

                      await updateFamilyLocation({
                        familyId: convexUser!.familyId,
                        location: location.trim(),
                      });

                      setDiscoveryProgress("");
                      setDiscoveryMessage(`✅ Success! Found ${result.activitiesDiscovered} new recommendations from ${result.eventsScraped} events.`);
                      showToast(`Found ${result.activitiesDiscovered} activities in your area!`, "success");
                      setDiscoveryKeyword(originalKeyword); // Reset to original
                    } catch (error: any) {
                      setDiscoveryProgress("");
                      setDiscoveryMessage(`❌ Error: ${error.message || "Unknown error occurred"}`);
                      showToast(error.message || "Could not find activities. Please try again.", "error");
                      setDiscoveryKeyword(originalKeyword); // Reset to original
                    } finally {
                      setIsDiscovering(false);
                      setTimeout(() => {
                        setDiscoveryMessage("");
                        setDiscoveryProgress("");
                      }, 8000);
                    }
                  }}
                  className="w-full p-4 bg-pink-50 rounded-xl text-left hover:bg-pink-100 transition min-h-[56px] flex items-center gap-3 border-2 border-transparent hover:border-pink-300"
                >
                  <span className="text-3xl">🎵</span>
                  <span className="font-semibold text-gray-900">Music Lessons</span>
                </button>
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5 max-w-2xl mx-auto">
                <p className="text-sm text-gray-800">
                  💡 <strong>Tip:</strong> Enter your location above, then click any example to start searching!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Details Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {setEditingActivity(null); setEditForm({});}}>
          <div className="bg-white rounded-2xl shadow-strong max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{editingActivity.title}</h2>
                <button
                  onClick={() => {setEditingActivity(null); setEditForm({});}}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition min-h-[44px] min-w-[44px]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-purple-50 mt-2">{editingActivity.category}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Essential Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                {editingActivity.type === 'event' && editingActivity.date && (
                  <div className="flex items-center gap-2 text-base">
                    <span className="text-xl">📅</span>
                    <div>
                      <span className="font-semibold">
                        {new Date(editingActivity.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: new Date(editingActivity.date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}
                      </span>
                      {editingActivity.time && (
                        <span className="ml-2">
                          at {(() => {
                            const [hours, minutes] = editingActivity.time.split(':');
                            const hour = parseInt(hours);
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            const displayHour = hour % 12 || 12;
                            return `${displayHour}:${minutes} ${ampm}`;
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {editingActivity.type === 'place' && editingActivity.hoursOfOperation && (
                  <div className="flex items-center gap-2 text-base">
                    <span className="text-xl">🕐</span>
                    <span><strong>Hours:</strong> {editingActivity.hoursOfOperation}</span>
                  </div>
                )}
                {editingActivity.location && (
                  <div className="flex items-start gap-2 text-base">
                    <span className="text-xl">📍</span>
                    <span>{editingActivity.location}</span>
                  </div>
                )}
                {(editingActivity.priceRange || editingActivity.admission) && (
                  <div className="flex items-center gap-2 text-base">
                    <span className="text-xl">💰</span>
                    <span>{editingActivity.admission || getPriceLabel(editingActivity.priceRange)}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {editingActivity.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                  <p className="text-gray-700 leading-relaxed">{editingActivity.description}</p>
                </div>
              )}

              {/* AI Summary */}
              {editingActivity.aiSummary && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <div className="text-xs font-bold text-blue-900 mb-1 uppercase tracking-wide">
                        Why This is Perfect for Your Family
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {editingActivity.aiSummary}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Details for Places */}
              {editingActivity.type === 'place' && editingActivity.amenities && editingActivity.amenities.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Features & Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {editingActivity.amenities.map((amenity: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              {(editingActivity.website || editingActivity.phoneNumber) && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="flex flex-wrap gap-3">
                    {editingActivity.website && (
                      <a
                        href={editingActivity.website.startsWith('http') ? editingActivity.website : `https://${editingActivity.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium"
                      >
                        🌐 Visit Website
                      </a>
                    )}
                    {editingActivity.phoneNumber && (
                      <a
                        href={`tel:${editingActivity.phoneNumber}`}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition font-medium"
                      >
                        📞 {editingActivity.phoneNumber}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={() => {setEditingActivity(null); setEditForm({});}}
                className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition min-h-[56px]"
              >
                Close
              </button>
              <button
                onClick={handleSaveAndAdd}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 min-h-[56px]"
              >
                Add to Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB - Floating Action Button */}
      <FAB
        onAction={handleFABAction}
        hasGmailAccount={!!gmailAccounts && gmailAccounts.length > 0}
      />

      {/* Photo Upload Modal */}
      {showPhotoUploadModal && (
        <PhotoUploadModal
          onClose={() => setShowPhotoUploadModal(false)}
          onExtract={async (file: File) => {
            // TODO: Implement photo extraction for discover page
            showToast("Photo upload coming soon!", "info");
            setShowPhotoUploadModal(false);
          }}
        />
      )}

      {/* Voice Record Modal */}
      {showVoiceRecordModal && (
        <VoiceRecordModal
          onClose={() => setShowVoiceRecordModal(false)}
          onTranscribe={async (audioBlob: Blob) => {
            // TODO: Implement voice transcription for discover page
            showToast("Voice recording coming soon!", "info");
            setShowVoiceRecordModal(false);
          }}
        />
      )}

      {/* Paste Text Modal */}
      {showPasteTextModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center p-4 z-50"
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
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleExtractFromPaste();
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => {
            setShowAddEventModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-strong my-4 md:my-8 max-h-[80vh] overflow-y-auto"
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
                    <option value="custom">+ Create custom category</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newEventForm.description}
                    onChange={(e) => setNewEventForm({ ...newEventForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Additional details..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition shadow-soft"
                  >
                    Save Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddEventModal(false)}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation (Mobile) */}
      <BottomNav />
    </div>
  );
}
