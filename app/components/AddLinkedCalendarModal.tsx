"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ButtonSpinner } from "./LoadingSpinner";
import { useToast } from "./Toast";
import { isValidCalendarUrl } from "@/lib/icalParser";

interface AddLinkedCalendarModalProps {
  familyId: Id<"families">;
  userId: Id<"users">;
  onClose: () => void;
  onSuccess: () => void;
}

type CalendarCategory = "school" | "sports" | "church" | "activities" | "other";

export default function AddLinkedCalendarModal({
  familyId,
  userId,
  onClose,
  onSuccess,
}: AddLinkedCalendarModalProps) {
  const { showToast } = useToast();

  const [step, setStep] = useState<"category" | "details">("category");
  const [category, setCategory] = useState<CalendarCategory | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [url, setUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [fetchedCalendarName, setFetchedCalendarName] = useState<string | null>(null);
  const [fetchingName, setFetchingName] = useState(false);

  const addLinkedCalendar = useMutation(api.linkedCalendars.addLinkedCalendar);

  const categories = [
    {
      value: "school" as const,
      icon: "🎒",
      label: "School Calendar",
      description: "Class schedules, events, breaks",
    },
    {
      value: "sports" as const,
      icon: "⚽",
      label: "Sports Team",
      description: "Games, practices, tournaments",
    },
    {
      value: "church" as const,
      icon: "⛪",
      label: "Church/Religious",
      description: "Services, classes, events",
    },
    {
      value: "activities" as const,
      icon: "🎵",
      label: "Activities & Clubs",
      description: "Music, dance, scouts, etc.",
    },
    {
      value: "other" as const,
      icon: "📅",
      label: "Other Calendar",
      description: "Any other calendar",
    },
  ];

  const handleCategorySelect = (cat: CalendarCategory) => {
    setCategory(cat);
    setStep("details");
  };

  const fetchCalendarName = async (calendarUrl: string) => {
    if (!isValidCalendarUrl(calendarUrl)) {
      return;
    }

    setFetchingName(true);
    try {
      const response = await fetch("/api/linked-calendars/fetch-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: calendarUrl.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.calendarName) {
          setFetchedCalendarName(data.calendarName);
        }
      }
    } catch (error) {
      console.error("Error fetching calendar name:", error);
    } finally {
      setFetchingName(false);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setFetchedCalendarName(null); // Reset when URL changes

    // Debounce the fetch - only fetch if URL looks valid
    if (isValidCalendarUrl(newUrl.trim())) {
      // Small delay to avoid fetching on every keystroke
      const timeoutId = setTimeout(() => {
        fetchCalendarName(newUrl);
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleTestUrl = async () => {
    if (!url.trim()) {
      showToast("Please enter a calendar URL", "error");
      return;
    }

    if (!isValidCalendarUrl(url)) {
      showToast("Please enter a valid iCal URL (must start with http:// or webcal://)", "error");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch("/api/linked-calendars/fetch-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          dateFilter: "upcoming",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch calendar");
      }

      const data = await response.json();

      if (data.success && data.events && data.events.length > 0) {
        showToast(`✓ Found ${data.events.length} upcoming events!`, "success");
      } else {
        showToast("Calendar looks good, but no upcoming events found", "info");
      }
    } catch (error: any) {
      console.error("Error testing URL:", error);
      showToast(error.message || "Couldn't reach that calendar. Check the URL?", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleAdd = async () => {
    if (!displayName.trim()) {
      showToast("Please enter a name for this calendar", "error");
      return;
    }

    if (!url.trim()) {
      showToast("Please enter the calendar URL", "error");
      return;
    }

    if (!isValidCalendarUrl(url)) {
      showToast("Please enter a valid iCal URL", "error");
      return;
    }

    if (!category) {
      showToast("Please select a category", "error");
      return;
    }

    setAdding(true);
    try {
      // Try to fetch the actual calendar name from the iCal feed
      let actualCalendarName: string | undefined = undefined;
      try {
        const nameResponse = await fetch("/api/linked-calendars/fetch-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });

        if (nameResponse.ok) {
          const nameData = await nameResponse.json();
          if (nameData.success && nameData.calendarName) {
            actualCalendarName = nameData.calendarName;
            console.log("Fetched actual calendar name:", actualCalendarName);
          }
        }
      } catch (nameError) {
        console.error("Error fetching calendar name:", nameError);
        // Continue without the calendar name - it's optional
      }

      await addLinkedCalendar({
        familyId,
        userId,
        displayName: displayName.trim(),
        actualCalendarName,
        category,
        url: url.trim(),
      });

      showToast("Calendar linked successfully!", "success");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error adding calendar:", error);
      showToast("Failed to link calendar. Please try again.", "error");
    } finally {
      setAdding(false);
    }
  };

  const getCategoryIcon = (cat: CalendarCategory) => {
    return categories.find(c => c.value === cat)?.icon || "📅";
  };

  const getCategoryLabel = (cat: CalendarCategory) => {
    return categories.find(c => c.value === cat)?.label || cat;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-strong max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-t-2xl sticky top-0">
          <div className="flex items-center justify-between">
            <div>
              {step === "category" ? (
                <>
                  <h2 className="text-2xl font-bold text-white">Link a Calendar</h2>
                  <p className="text-purple-50 mt-1 text-sm">What kind of calendar is this?</p>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setStep("category")}
                    className="text-purple-50 hover:text-white mb-2 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <h2 className="text-2xl font-bold text-white">
                    {getCategoryIcon(category!)} {getCategoryLabel(category!)}
                  </h2>
                  <p className="text-purple-50 mt-1 text-sm">Enter the calendar details</p>
                </>
              )}
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

        {/* Content */}
        <div className="p-6">
          {step === "category" ? (
            <div className="space-y-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategorySelect(cat.value)}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-5xl group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{cat.label}</h3>
                      <p className="text-sm text-gray-600">{cat.description}</p>
                    </div>
                    <svg
                      className="w-6 h-6 text-gray-400 group-hover:text-purple-600 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Give it a friendly name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Jefferson Elementary"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">This is just for you to remember</p>
              </div>

              {/* Calendar URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calendar link (iCal/webcal URL) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/calendar.ics"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />

                {/* Show fetched calendar name */}
                {fetchingName && (
                  <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                    <ButtonSpinner />
                    Fetching calendar name...
                  </div>
                )}

                {fetchedCalendarName && !fetchingName && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-900">Calendar found!</p>
                        <p className="text-sm text-green-800 mt-1">
                          <span className="font-medium">Name:</span> {fetchedCalendarName}
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          You can use this name or customize it below
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-sm text-purple-600 hover:text-purple-700 mt-2 flex items-center gap-1"
                >
                  💡 Where do I find this?
                </button>

                {showHelp && (
                  <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-800 space-y-3">
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">ParentSquare</h4>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Open the Calendar tab</li>
                        <li>Tap Settings (gear icon)</li>
                        <li>Tap "Subscribe to Calendar"</li>
                        <li>Copy the link</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Google Calendar</h4>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Open Google Calendar settings</li>
                        <li>Find the calendar under "Settings for my calendars"</li>
                        <li>Scroll to "Integrate calendar"</li>
                        <li>Copy the "Secret address in iCal format"</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">TeamSnap / Other</h4>
                      <p className="text-xs">Look for "Export", "Subscribe", or "Add to Calendar" buttons</p>
                    </div>
                  </div>
                )}

                {url && (
                  <button
                    onClick={handleTestUrl}
                    disabled={testing}
                    className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {testing ? (
                      <>
                        <ButtonSpinner />
                        Testing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Test Calendar Link
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding || !displayName.trim() || !url.trim()}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <>
                      <ButtonSpinner />
                      Linking...
                    </>
                  ) : (
                    "Link Calendar"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
