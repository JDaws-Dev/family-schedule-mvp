"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { useSearchParams } from "next/navigation";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../calendar/calendar.css";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Helper function to convert 24-hour time to 12-hour format
function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function EventsContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarView, setCalendarView] = useState<View>("month");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const searchParams = useSearchParams();

  // Mutations
  const deleteEvent = useMutation(api.events.deleteEvent);

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

  // Get unconfirmed events count
  const unconfirmedEvents = useQuery(
    api.events.getUnconfirmedEvents,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get family members for filtering
  const familyMembers = useQuery(
    api.familyMembers.getFamilyMembers,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get Gmail accounts
  const gmailAccounts = useQuery(
    api.gmailAccounts.getFamilyGmailAccounts,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  const isGmailConnected = (gmailAccounts?.length ?? 0) > 0;

  // Extract unique categories from events
  const categories = useMemo(() => {
    if (!confirmedEvents) return [];
    const uniqueCategories = new Set<string>();
    confirmedEvents.forEach((event) => {
      if (event.category) uniqueCategories.add(event.category);
    });
    return Array.from(uniqueCategories).sort();
  }, [confirmedEvents]);

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    if (!confirmedEvents) return [];

    return confirmedEvents.filter((event) => {
      // Search filter
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

      // Category filter
      if (filterCategory !== "all" && event.category !== filterCategory) {
        return false;
      }

      return true;
    });
  }, [confirmedEvents, searchQuery, filterMember, filterCategory]);

  // Get upcoming events (sorted by date)
  const upcomingEvents = useMemo(() => {
    if (!filteredEvents) return [];
    return filteredEvents
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .slice(0, 50); // Show first 50 events in list view
  }, [filteredEvents]);

  // Transform events for calendar view
  const calendarEvents = useMemo(() => {
    if (!filteredEvents) return [];

    return filteredEvents.map((event) => {
      const [year, month, day] = event.eventDate.split("-").map(Number);
      let start = new Date(year, month - 1, day);
      let end = new Date(year, month - 1, day);

      if (event.eventTime) {
        const timeMatch = event.eventTime.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          start.setHours(hours, minutes);
          end.setHours(hours + 1, minutes);
        }
      }

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
        resource: event,
      };
    });
  }, [filteredEvents]);

  const eventStyleGetter = (event: any) => {
    const childName = event.resource?.childName;
    let backgroundColor = "#6366f1"; // Default indigo

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

  const handleScanEmail = async () => {
    if (!gmailAccounts || gmailAccounts.length === 0) {
      setScanMessage("Please connect a Gmail account first");
      return;
    }

    setIsScanning(true);
    setScanMessage("Scanning emails...");

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
          `Scan complete! Found ${data.eventsFound} event(s) from ${data.messagesScanned} messages.`
        );
        setTimeout(() => setScanMessage(""), 5000);
      } else {
        setScanMessage(`Error: ${data.error}`);
        setTimeout(() => setScanMessage(""), 5000);
      }
    } catch (error) {
      console.error("Scan error:", error);
      setScanMessage("Failed to scan emails. Please try again.");
      setTimeout(() => setScanMessage(""), 5000);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSyncAllToGoogleCalendar = useCallback(async () => {
    if (!confirmedEvents || syncing) return;

    setSyncing(true);
    let successCount = 0;
    let errorCount = 0;
    let needsReconnect = false;

    try {
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
              const data = await response.json();
              if (data.needsReconnect) {
                needsReconnect = true;
                break;
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
          window.location.href = "/api/auth/google?returnUrl=/events";
        }
        return;
      }

      if (successCount > 0) {
        alert(
          `Successfully synced ${successCount} event${successCount !== 1 ? "s" : ""} to Google Calendar!`
        );
      }
      if (errorCount > 0) {
        alert(
          `Failed to sync ${errorCount} event${errorCount !== 1 ? "s" : ""}. Please try again.`
        );
      }
      if (successCount === 0 && errorCount === 0) {
        alert("All events are already synced to Google Calendar!");
      }
    } catch (error) {
      console.error("Error syncing to Google Calendar:", error);
      alert("Failed to sync events. Please try again.");
    } finally {
      setSyncing(false);
    }
  }, [confirmedEvents, syncing]);

  useEffect(() => {
    const success = searchParams.get("success");

    if (success === "gmail_connected") {
      window.history.replaceState({}, "", "/events");
      alert("Google account reconnected successfully! You can now sync your events to Google Calendar.");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            Our Daily Family
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/events" className="text-indigo-600 font-medium">
              Events
            </Link>
            <Link
              href="/inbox"
              className="text-gray-600 hover:text-gray-900 relative"
            >
              Inbox
              {unconfirmedEvents && unconfirmedEvents.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unconfirmedEvents.length}
                </span>
              )}
            </Link>
            <Link href="/discover" className="text-gray-600 hover:text-gray-900">
              Discover
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
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="flex flex-col py-2">
              <Link
                href="/events"
                className="px-4 py-3 text-indigo-600 font-medium bg-indigo-50"
              >
                Events
              </Link>
              <Link href="/inbox" className="px-4 py-3 text-gray-600 hover:bg-gray-50 relative">
                <span>Inbox</span>
                {unconfirmedEvents && unconfirmedEvents.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {unconfirmedEvents.length}
                  </span>
                )}
              </Link>
              <Link href="/discover" className="px-4 py-3 text-gray-600 hover:bg-gray-50">
                Discover
              </Link>
              <Link href="/settings" className="px-4 py-3 text-gray-600 hover:bg-gray-50">
                Settings
              </Link>
              <button
                onClick={() => signOut()}
                className="px-4 py-3 text-left text-gray-600 hover:bg-gray-50 w-full"
              >
                Log Out
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header with Actions */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Events</h1>
              <p className="text-gray-600 mt-1">
                {confirmedEvents === undefined
                  ? "Loading events..."
                  : `${filteredEvents.length} of ${confirmedEvents.length} event${confirmedEvents.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/inbox"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                + Add Event
              </Link>
              <button
                onClick={handleScanEmail}
                disabled={isScanning || !isGmailConnected}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isScanning ? "Scanning..." : "Scan Email"}
              </button>
            </div>
          </div>

          {/* Scan message */}
          {scanMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              {scanMessage}
            </div>
          )}

          {/* Pending events banner */}
          {unconfirmedEvents && unconfirmedEvents.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-amber-900">
                    {unconfirmedEvents.length} event{unconfirmedEvents.length !== 1 ? "s" : ""} waiting for review
                  </span>
                  <p className="text-sm text-amber-700 mt-1">
                    AI found new events from your emails that need confirmation
                  </p>
                </div>
                <Link
                  href="/inbox"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition"
                >
                  Review →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* View Toggle and Filters */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          {/* View Toggle */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  viewMode === "list"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  viewMode === "calendar"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Calendar View
              </button>
            </div>
            {calendarEvents.length > 0 && (
              <button
                onClick={handleSyncAllToGoogleCalendar}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {syncing ? "Syncing..." : "📅 Sync All"}
              </button>
            )}
          </div>

          {/* Filters */}
          {confirmedEvents && confirmedEvents.length > 0 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search input */}
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <input
                    id="search"
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Family member filter */}
                <div>
                  <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-1">
                    Family Member
                  </label>
                  <select
                    id="member"
                    value={filterMember}
                    onChange={(e) => setFilterMember(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Members</option>
                    {familyMembers?.map((member) => (
                      <option key={member._id} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category filter */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear filters button */}
              {(searchQuery || filterMember !== "all" || filterCategory !== "all") && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterMember("all");
                      setFilterCategory("all");
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Area - List or Calendar */}
        {viewMode === "list" ? (
          /* List View */
          <div className="bg-white rounded-lg shadow">
            <div className="divide-y divide-gray-200">
              {upcomingEvents === undefined ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : upcomingEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600 mb-2">No events found</p>
                  <p className="text-sm text-gray-500">
                    {isGmailConnected
                      ? "Scan your email to find events or add one manually"
                      : "Connect your Gmail to get started"}
                  </p>
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <div
                    key={event._id}
                    className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            📅 {event.eventDate}
                          </span>
                          {event.eventTime && (
                            <span className="flex items-center gap-1">
                              🕐 {formatTime12Hour(event.eventTime)}
                              {event.endTime && ` - ${formatTime12Hour(event.endTime)}`}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              📍 {event.location}
                            </span>
                          )}
                        </div>
                        {event.category && (
                          <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {event.category}
                          </span>
                        )}
                      </div>
                      {event.childName && (
                        <div className="sm:ml-4">
                          {(() => {
                            const firstName = event.childName.split(",")[0].trim();
                            const member = familyMembers?.find(m => m.name === firstName);
                            const color = member?.color || "#6366f1";
                            return (
                              <span
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: color }}
                              >
                                {event.childName}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Calendar View */
          <div className="bg-white rounded-lg shadow p-4 sm:p-6" style={{ height: "700px" }}>
            {confirmedEvents === undefined ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading calendar...</div>
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-xl font-semibold text-gray-900 mb-2">No events yet</div>
                <p className="text-gray-600 mb-4">
                  Scan your emails or add events manually to get started
                </p>
              </div>
            ) : (
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                view={calendarView}
                onView={(newView) => setCalendarView(newView)}
                date={calendarDate}
                onNavigate={(newDate) => setCalendarDate(newDate)}
                views={["month", "week", "day", "agenda"]}
                popup
              />
            )}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-gray-600 font-medium w-24">Date:</span>
                <span className="text-gray-900">{selectedEvent.eventDate}</span>
              </div>

              {selectedEvent.eventTime && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 font-medium w-24">Time:</span>
                  <span className="text-gray-900">
                    {formatTime12Hour(selectedEvent.eventTime)}
                    {selectedEvent.endTime && ` - ${formatTime12Hour(selectedEvent.endTime)}`}
                  </span>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 font-medium w-24">Location:</span>
                  <span className="text-gray-900">{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.childName && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 font-medium w-24">Member:</span>
                  {(() => {
                    const firstName = selectedEvent.childName.split(",")[0].trim();
                    const member = familyMembers?.find(m => m.name === firstName);
                    const color = member?.color || "#6366f1";
                    return (
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: color }}
                      >
                        {selectedEvent.childName}
                      </span>
                    );
                  })()}
                </div>
              )}

              {selectedEvent.description && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 font-medium w-24">Details:</span>
                  <span className="text-gray-900">{selectedEvent.description}</span>
                </div>
              )}

              {selectedEvent.category && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 font-medium w-24">Category:</span>
                  <span className="text-gray-900">{selectedEvent.category}</span>
                </div>
              )}

              {selectedEvent.requiresAction && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 font-medium w-24">Action:</span>
                  <div className="flex-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      RSVP Required
                    </span>
                    {selectedEvent.actionDeadline && (
                      <p className="text-sm text-gray-600 mt-1">
                        Deadline: {selectedEvent.actionDeadline}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedEvent.sourceEmailSubject && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 font-medium w-24">Source:</span>
                  <div className="flex-1">
                    <div className="text-gray-600 text-sm mb-1">
                      From email: <span className="font-medium">{selectedEvent.sourceEmailSubject}</span>
                    </div>
                    {selectedEvent.sourceGmailAccountId && gmailAccounts && (
                      <div className="text-gray-500 text-xs mb-2">
                        Gmail:{" "}
                        {gmailAccounts.find((a) => a._id === selectedEvent.sourceGmailAccountId)
                          ?.gmailEmail || "Unknown"}
                      </div>
                    )}
                    {selectedEvent.sourceEmailSubject && (
                      <a
                        href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
                          `subject:"${selectedEvent.sourceEmailSubject}"`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Search in Gmail
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={async () => {
                  if (confirm(`Delete "${selectedEvent.title}"?`)) {
                    if (selectedEvent.googleCalendarEventId) {
                      try {
                        await fetch("/api/delete-from-calendar", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ eventId: selectedEvent._id }),
                        });
                      } catch (error) {
                        console.error("Error deleting from Google Calendar:", error);
                      }
                    }

                    await deleteEvent({ eventId: selectedEvent._id });
                    setSelectedEvent(null);
                  }
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Delete
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
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

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <EventsContent />
    </Suspense>
  );
}
