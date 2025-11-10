"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

export default function SearchEmailsPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();

  // Only query if we have a clerk user ID
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  const familyMembers = useQuery(
    api.familyMembers.getFamilyMembers,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  const createEvent = useMutation(api.events.create);

  const [emailSearchQuery, setEmailSearchQuery] = useState("");
  const [emailSearchTimeframe, setEmailSearchTimeframe] = useState("3");
  const [isSearchingEmails, setIsSearchingEmails] = useState(false);
  const [emailList, setEmailList] = useState<any[]>([]);
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [isExtractingFromEmails, setIsExtractingFromEmails] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState<any[]>([]);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [showToastMessage, setShowToastMessage] = useState<{message: string, type: string} | null>(null);

  const showToast = (message: string, type: string) => {
    setShowToastMessage({ message, type });
    setTimeout(() => setShowToastMessage(null), 5000);
  };

  const standardCategories = ["Sports", "School", "Medical", "Social", "Appointment", "Birthday", "Holiday", "Other"];
  const existingCategories = standardCategories; // Simplified for now

  const handleSearch = async () => {
    if (!emailSearchQuery.trim() || isSearchingEmails) return;

    setIsSearchingEmails(true);
    setEmailList([]);
    setSelectedEmailIds(new Set());
    setExtractedEvents([]);

    try {
      const response = await fetch("/api/list-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: emailSearchQuery,
          familyId: convexUser?.familyId,
          timeframeMonths: parseInt(emailSearchTimeframe)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to search emails", "error");
      } else if (data.error) {
        showToast(data.error, "error");
      } else {
        setEmailList(data.emails || []);
        if (data.emails && data.emails.length === 0) {
          showToast("No emails found matching your search", "info");
        } else {
          showToast(`Found ${data.emails.length} email(s)!`, "success");
        }
      }
    } catch (error) {
      console.error("Email search error:", error);
      showToast("Failed to search emails. Please try again.", "error");
    } finally {
      setIsSearchingEmails(false);
    }
  };

  const handleExtractEvents = async () => {
    setIsExtractingFromEmails(true);
    setExtractedEvents([]);

    try {
      const response = await fetch("/api/extract-from-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailIds: Array.from(selectedEmailIds),
          familyId: convexUser?.familyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to extract events", "error");
      } else if (data.error) {
        showToast(data.error, "error");
      } else {
        setExtractedEvents(data.events || []);
        if (data.events && data.events.length === 0) {
          showToast("No events found in selected emails", "info");
        } else {
          showToast(`Extracted ${data.events.length} event(s)!`, "success");
        }
      }
    } catch (error) {
      console.error("Event extraction error:", error);
      showToast("Failed to extract events. Please try again.", "error");
    } finally {
      setIsExtractingFromEmails(false);
    }
  };

  // Show loading state while authentication is initializing
  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Redirect to sign in if no user
  if (!clerkUser) {
    router.push("/sign-in");
    return null;
  }

  // Wait for convex user to load
  if (convexUser === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading your account...</p>
      </div>
    );
  }

  // If no convex user exists, show error
  if (!convexUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Account Error</p>
          <p className="text-gray-600">Unable to load your account. Please try signing out and back in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-accent-600">Search Emails</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are you looking for?
              </label>
              <input
                type="text"
                value={emailSearchQuery}
                onChange={(e) => setEmailSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSearchingEmails && emailSearchQuery.trim()) {
                    // Trigger search
                    handleSearch();
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., baseball schedule, soccer registration, piano recital..."
              />
            </div>

            <div className="flex gap-3">
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

              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={!emailSearchQuery.trim() || isSearchingEmails}
                  className="px-6 py-3 bg-accent-500 text-white rounded-lg font-semibold hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-soft flex items-center gap-2 whitespace-nowrap"
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
                      Search Emails
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              💡 Tip: Be specific! Try "baseball practice schedule" or "soccer team registration"
            </p>
          </div>
        </div>

        {/* Results - Email List */}
        {emailList.length > 0 && !extractedEvents.length && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Found {emailList.length} email(s) - Select emails to extract events from:
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedEmailIds(new Set(emailList.map(e => e.id)))}
                  className="text-sm text-accent-600 hover:text-accent-700 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setSelectedEmailIds(new Set())}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {emailList.map((email: any) => (
                <div key={email.id} className="border border-gray-200 rounded-lg">
                  {/* Email Summary - Always visible */}
                  <div
                    className={`p-4 transition cursor-pointer ${
                      selectedEmailIds.has(email.id)
                        ? 'border-accent-500 bg-accent-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      const newSelected = new Set(selectedEmailIds);
                      if (newSelected.has(email.id)) {
                        newSelected.delete(email.id);
                      } else {
                        newSelected.add(email.id);
                      }
                      setSelectedEmailIds(newSelected);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEmailIds.has(email.id)}
                        onChange={() => {}}
                        className="mt-1 h-5 w-5 text-accent-600 rounded focus:ring-accent-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{email.subject}</h4>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(email.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">From: {email.from}</p>
                        {email.snippet && (
                          <p className="text-sm text-gray-500 line-clamp-2">{email.snippet}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-primary-500">📧 {email.accountEmail}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedEmailId(expandedEmailId === email.id ? null : email.id);
                            }}
                            className="text-xs text-accent-600 hover:text-accent-700 font-medium ml-auto"
                          >
                            {expandedEmailId === email.id ? "Hide full email" : "View full email"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Email Content */}
                  {expandedEmailId === email.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <h5 className="font-semibold text-gray-900 mb-2">Full Email Content:</h5>
                      <div className="bg-white p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{email.snippet}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Extract Button - Fixed at bottom */}
            {selectedEmailIds.size > 0 && (
              <div className="flex items-center justify-between bg-accent-50 p-4 rounded-lg sticky bottom-0">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{selectedEmailIds.size}</span> email(s) selected
                </p>
                <button
                  onClick={handleExtractEvents}
                  disabled={isExtractingFromEmails}
                  className="px-6 py-3 bg-accent-500 text-white rounded-lg font-semibold hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-soft flex items-center gap-2"
                >
                  {isExtractingFromEmails ? (
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Extract Events from Selected
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Extracted Events Section */}
        {extractedEvents.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Extracted Events ({extractedEvents.length})
            </h2>

            <div className="space-y-3">
              {extractedEvents.map((event: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-accent-500 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>📅 {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        {event.eventTime && <p>🕐 {event.eventTime}{event.endTime && ` - ${event.endTime}`}</p>}
                        {event.location && <p>📍 {event.location}</p>}
                        {event.category && <p>🏷️ {event.category}</p>}
                        {event.description && <p className="mt-2 text-gray-700">{event.description}</p>}
                      </div>
                      {event.sourceEmailSubject && (
                        <p className="text-xs text-gray-500 mt-2">From: {event.sourceEmailSubject}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingEvent(event)}
                      className="px-4 py-2 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 transition whitespace-nowrap"
                    >
                      Review & Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setExtractedEvents([]);
                  setEmailList([]);
                  setSelectedEmailIds(new Set());
                }}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Start New Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[75vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white p-6 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Review & Edit Event
                </h2>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!convexUser) {
                showToast("User not loaded. Please try again.", "error");
                return;
              }
              try {
                await createEvent({
                  createdByUserId: convexUser._id,
                  title: editingEvent.title,
                  eventDate: editingEvent.eventDate,
                  eventTime: editingEvent.eventTime || undefined,
                  endTime: editingEvent.endTime || undefined,
                  location: editingEvent.location || undefined,
                  category: editingEvent.category || undefined,
                  childName: editingEvent.childName || undefined,
                  description: editingEvent.description || undefined,
                  requiresAction: editingEvent.requiresAction || false,
                  actionDescription: editingEvent.actionDescription || undefined,
                  actionDeadline: editingEvent.actionDeadline || undefined,
                  isConfirmed: true,
                });
                showToast("Event added to calendar!", "success");
                setEditingEvent(null);
                // Remove from extracted events
                setExtractedEvents(extractedEvents.filter((_, i) => i !== extractedEvents.indexOf(editingEvent)));
              } catch (error) {
                console.error("Failed to add event:", error);
                showToast("Failed to add event. Please try again.", "error");
              }
            }}>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editingEvent.eventDate}
                    onChange={(e) => setEditingEvent({ ...editingEvent, eventDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={editingEvent.eventTime || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, eventTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={editingEvent.endTime || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editingEvent.location || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Family Members</label>
                  <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
                    {familyMembers && familyMembers.length > 0 ? (
                      [...familyMembers].sort((a, b) => a.name.localeCompare(b.name)).map((member) => {
                        const selectedMembers = editingEvent.childName ? editingEvent.childName.split(", ") : [];
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
                              setEditingEvent({
                                ...editingEvent,
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
                      <p className="text-sm text-gray-500">No family members added yet.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={editingEvent.category || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "custom") {
                        const customCategory = prompt("Enter custom category:");
                        if (customCategory && customCategory.trim()) {
                          setEditingEvent({ ...editingEvent, category: customCategory.trim() });
                        }
                      } else {
                        setEditingEvent({ ...editingEvent, category: value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a category...</option>
                    <optgroup label="Standard Categories">
                      {standardCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
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
                    value={editingEvent.description || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 p-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition shadow-soft"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToastMessage && (
        <div className="fixed bottom-24 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {showToastMessage.message}
        </div>
      )}
    </div>
  );
}
