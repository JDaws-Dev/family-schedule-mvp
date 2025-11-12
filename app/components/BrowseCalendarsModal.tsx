"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ButtonSpinner } from "./LoadingSpinner";
import { useToast } from "./Toast";

interface CalendarEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endDate?: string;
  endTime?: string;
  isAllDay: boolean;
}

interface BrowseCalendarsModalProps {
  familyId: Id<"families">;
  userId: Id<"users">;
  onClose: () => void;
}

export default function BrowseCalendarsModal({
  familyId,
  userId,
  onClose,
}: BrowseCalendarsModalProps) {
  const { showToast } = useToast();

  // Get linked calendars
  const linkedCalendars = useQuery(api.linkedCalendars.getLinkedCalendars, { familyId });

  // Get family members for event assignment
  const familyMembers = useQuery(api.familyMembers.getFamilyMembers, { familyId });

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"upcoming" | "this_week" | "this_month" | "all">("upcoming");
  const [selectedCalendarId, setSelectedCalendarId] = useState<Id<"linkedCalendars"> | "all">("all");
  const [events, setEvents] = useState<Array<CalendarEvent & { calendarName: string; calendarId: Id<"linkedCalendars"> }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<(CalendarEvent & { calendarName: string; calendarId: Id<"linkedCalendars"> }) | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [editedTime, setEditedTime] = useState("");
  const [editedEndTime, setEditedEndTime] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedCategory, setEditedCategory] = useState("Sports");

  // Mutations
  const createEvent = useMutation(api.events.createEvent);

  // Fetch events when modal opens or filters change
  useEffect(() => {
    if (linkedCalendars && linkedCalendars.length > 0) {
      fetchEvents();
    }
  }, [linkedCalendars, selectedCalendarId, dateFilter]);

  const fetchEvents = async () => {
    if (!linkedCalendars || linkedCalendars.length === 0) return;

    setLoading(true);
    setEvents([]);

    try {
      const calendarsToFetch = selectedCalendarId === "all"
        ? linkedCalendars
        : linkedCalendars.filter(cal => cal._id === selectedCalendarId);

      const allEvents: Array<CalendarEvent & { calendarName: string; calendarId: Id<"linkedCalendars"> }> = [];

      for (const calendar of calendarsToFetch) {
        try {
          const response = await fetch("/api/linked-calendars/fetch-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: calendar.url,
              dateFilter: dateFilter === "all" ? undefined : dateFilter,
            }),
          });

          if (!response.ok) {
            console.error(`Failed to fetch ${calendar.displayName}:`, await response.text());
            continue;
          }

          const data = await response.json();

          if (data.success && data.events) {
            data.events.forEach((event: CalendarEvent) => {
              allEvents.push({
                ...event,
                calendarName: calendar.displayName,
                calendarId: calendar._id,
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching ${calendar.displayName}:`, error);
        }
      }

      // Sort by date
      allEvents.sort((a, b) => {
        if (a.startDate !== b.startDate) {
          return a.startDate.localeCompare(b.startDate);
        }
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return 0;
      });

      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      showToast("Failed to load calendar events", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      event.title.toLowerCase().includes(search) ||
      event.description?.toLowerCase().includes(search) ||
      event.location?.toLowerCase().includes(search) ||
      event.calendarName.toLowerCase().includes(search)
    );
  });

  const handleSelectEvent = (event: CalendarEvent & { calendarName: string; calendarId: Id<"linkedCalendars"> }) => {
    setSelectedEvent(event);
    setEditedTitle(event.title);
    setEditedDate(event.startDate);
    setEditedTime(event.startTime || "");
    setEditedEndTime(event.endTime || "");
    setEditedLocation(event.location || "");
    setEditedCategory("Sports");
    setSelectedMembers([]);
    setNotes(event.description || "");
  };

  const handleAddEvent = async () => {
    if (!selectedEvent) return;

    if (!editedTitle.trim()) {
      showToast("Please enter an event title", "error");
      return;
    }

    if (!editedDate) {
      showToast("Please select a date", "error");
      return;
    }

    setAddingEvent(true);
    try {
      await createEvent({
        createdByUserId: userId,
        title: editedTitle.trim(),
        eventDate: editedDate,
        eventTime: editedTime || undefined,
        endTime: editedEndTime || undefined,
        location: editedLocation.trim() || undefined,
        description: notes.trim() || undefined,
        category: editedCategory,
        childName: selectedMembers.join(", ") || undefined,
        isConfirmed: true,
      });

      showToast("Event added to your calendar!", "success");
      setSelectedEvent(null);
      setSelectedMembers([]);
      setNotes("");
    } catch (error) {
      console.error("Error adding event:", error);
      showToast("Failed to add event", "error");
    } finally {
      setAddingEvent(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      school: '🎒',
      sports: '⚽',
      church: '⛪',
      activities: '🎵',
      other: '📅',
    };
    return icons[category] || '📅';
  };

  if (!linkedCalendars) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-strong max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Browse Calendars</h2>
              <p className="text-purple-50 mt-1 text-sm">
                Find events from your linked calendars and add them to your schedule
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition min-h-[44px] min-w-[44px]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {linkedCalendars.length === 0 ? (
          <div className="p-12 text-center flex-1">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Calendars Linked</h3>
            <p className="text-gray-600 mb-6">
              Link calendars from your school, sports teams, or church to browse their events here.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
            >
              Go to Settings to Add Calendars
            </button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="p-6 border-b border-gray-200 space-y-4 flex-shrink-0">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Filter buttons */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value as any)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Calendars ({linkedCalendars.length})</option>
                  {linkedCalendars.map((cal) => (
                    <option key={cal._id} value={cal._id}>
                      {getCategoryIcon(cal.category)} {cal.displayName}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2 flex-wrap">
                  {(['upcoming', 'this_week', 'this_month', 'all'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDateFilter(filter)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        dateFilter === filter
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {filter === 'upcoming' && 'Next 30 Days'}
                      {filter === 'this_week' && 'This Week'}
                      {filter === 'this_month' && 'This Month'}
                      {filter === 'all' && 'All Events'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                  <p className="text-gray-600 mt-4">Loading events...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🤷‍♀️</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Events Found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? `No events match "${searchTerm}"` : "No upcoming events in these calendars"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.map((event, index) => (
                    <div
                      key={`${event.calendarId}-${event.uid}-${index}`}
                      className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                              {event.calendarName}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 mb-1">
                            {event.title}
                          </h4>
                          <div className="text-sm text-gray-700 space-y-1">
                            <div className="flex items-center gap-2">
                              <span>📅</span>
                              <span>
                                {formatDate(event.startDate)}
                                {event.isAllDay ? (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">All Day</span>
                                ) : event.startTime && (
                                  <span className="ml-2">at {formatTime(event.startTime)}</span>
                                )}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <span>📍</span>
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                            {event.description && (
                              <div className="flex items-start gap-2 mt-2">
                                <span>📝</span>
                                <span className="text-gray-600 text-xs line-clamp-2">{event.description}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSelectEvent(event)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition whitespace-nowrap"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Event Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-strong max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Add to Your Calendar</h3>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Event title"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editedTime}
                    onChange={(e) => setEditedTime(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {/* End Time and Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editedEndTime}
                    onChange={(e) => setEditedEndTime(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="Sports">Sports</option>
                    <option value="School">School</option>
                    <option value="Lessons">Lessons</option>
                    <option value="Appointments">Appointments</option>
                    <option value="Social">Social</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={editedLocation}
                  onChange={(e) => setEditedLocation(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Where is this event?"
                />
              </div>

              {/* Assign to family members */}
              {familyMembers && familyMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {familyMembers.map((member) => {
                      const isSelected = selectedMembers.includes(member.name);
                      return (
                        <button
                          key={member._id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMembers(selectedMembers.filter(m => m !== member.name));
                            } else {
                              setSelectedMembers([...selectedMembers, member.name]);
                            }
                          }}
                          className={`px-3 py-2 rounded-lg border-2 transition-all font-medium ${
                            isSelected
                              ? 'border-green-600 shadow-md'
                              : 'bg-white border-gray-300 hover:border-gray-400'
                          }`}
                          style={{
                            backgroundColor: isSelected ? member.color || "#10b981" : undefined,
                            color: isSelected ? "white" : "#374151"
                          }}
                        >
                          {isSelected && <span className="mr-1">✓</span>}
                          {member.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add notes (optional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Pack lunch, bring $10, etc."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={addingEvent}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {addingEvent ? (
                    <>
                      <ButtonSpinner />
                      Adding...
                    </>
                  ) : (
                    "Add Event"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
