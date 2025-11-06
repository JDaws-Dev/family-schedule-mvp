"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Helper function to convert 24-hour time to 12-hour format
function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function InboxPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set()); // For add modal
  const [editSelectedMembers, setEditSelectedMembers] = useState<Set<string>>(new Set()); // For edit modal
  const [showPasteSMSModal, setShowPasteSMSModal] = useState(false);
  const [showUploadSMSModal, setShowUploadSMSModal] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [smsScreenshot, setSmsScreenshot] = useState<File | null>(null);
  const [smsProcessing, setSmsProcessing] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);
  const { user: clerkUser} = useUser();
  const { signOut } = useClerk();

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

  // Get family members for the dropdown
  const familyMembers = useQuery(
    api.familyMembers.getFamilyMembers,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Mutations
  const confirmEvent = useMutation(api.events.confirmEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const createEvent = useMutation(api.events.createConfirmedEvent);

  const handleApprove = async (eventId: Id<"events">) => {
    await confirmEvent({ eventId });

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
    await deleteEvent({ eventId });
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    // Parse existing childName to initialize selected members
    const initialMembers = new Set<string>();
    if (event.childName) {
      if (event.childName === "All Family Members") {
        initialMembers.add("all");
      } else {
        // Split comma-separated names
        event.childName.split(",").forEach((name: string) => {
          initialMembers.add(name.trim());
        });
      }
    }
    setEditSelectedMembers(initialMembers);
    setShowEditEventModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEvent) return;

    const formData = new FormData(e.currentTarget);

    // Convert selected members to comma-separated string
    let childNameValue: string | undefined = undefined;
    if (editSelectedMembers.has("all")) {
      childNameValue = "All Family Members";
    } else if (editSelectedMembers.size > 0) {
      childNameValue = Array.from(editSelectedMembers).join(", ");
    }

    await updateEvent({
      eventId: editingEvent._id,
      title: formData.get("title") as string,
      eventDate: formData.get("eventDate") as string,
      eventTime: formData.get("eventTime") as string || undefined,
      endTime: formData.get("endTime") as string || undefined,
      location: formData.get("location") as string || undefined,
      childName: childNameValue,
      description: formData.get("description") as string || undefined,
    });

    setShowEditEventModal(false);
    setEditingEvent(null);
    setEditSelectedMembers(new Set());
  };

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!convexUser) return;

    const formData = new FormData(e.currentTarget);

    // Convert selected members to comma-separated string
    let childNameValue: string | undefined = undefined;
    if (selectedMembers.has("all")) {
      childNameValue = "All Family Members";
    } else if (selectedMembers.size > 0) {
      childNameValue = Array.from(selectedMembers).join(", ");
    }

    await createEvent({
      familyId: convexUser.familyId,
      createdByUserId: convexUser._id,
      title: formData.get("title") as string,
      eventDate: formData.get("eventDate") as string,
      eventTime: formData.get("eventTime") as string || undefined,
      endTime: formData.get("endTime") as string || undefined,
      location: formData.get("location") as string || undefined,
      category: formData.get("category") as string || undefined,
      childName: childNameValue,
      description: formData.get("description") as string || undefined,
    });

    setShowAddEventModal(false);
    setSelectedMembers(new Set());
  };

  const handleScanEmail = async () => {
    if (!gmailAccounts || gmailAccounts.length === 0) {
      setScanMessage("Please connect a Gmail account first");
      setTimeout(() => setScanMessage(""), 3000);
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

  const handlePasteSMS = async () => {
    if (!smsText.trim()) {
      setSmsResult({ error: "Please paste some text to analyze" });
      return;
    }

    setSmsProcessing(true);
    setSmsResult(null);

    try {
      const response = await fetch("/api/sms/extract-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsText }),
      });

      const data = await response.json();

      if (response.ok && data.hasEvent) {
        // Create an unconfirmed event from the SMS data
        await createEvent({
          familyId: convexUser!.familyId,
          title: data.event.title,
          date: data.event.date,
          time: data.event.time,
          endTime: data.event.endTime,
          location: data.event.location,
          category: data.event.category || "other",
          childName: Array.from(selectedMembers).join(", ") || undefined,
          description: data.event.description,
          confirmed: false, // Add to inbox for review
        });

        setSmsResult({
          success: true,
          message: `Event extracted: "${data.event.title}". Check your inbox to review!`,
          confidence: data.confidence,
        });
        setSmsText("");
        setSelectedMembers(new Set());
        setTimeout(() => {
          setShowPasteSMSModal(false);
          setSmsResult(null);
        }, 3000);
      } else if (response.ok && !data.hasEvent) {
        setSmsResult({
          success: false,
          message: `No event found in the text. ${data.explanation || ""}`,
        });
      } else {
        setSmsResult({ error: data.error || "Failed to extract event" });
      }
    } catch (error: any) {
      console.error("SMS extraction error:", error);
      setSmsResult({ error: "Failed to process SMS text" });
    } finally {
      setSmsProcessing(false);
    }
  };

  const handleUploadScreenshot = async () => {
    if (!smsScreenshot) {
      setSmsResult({ error: "Please select a screenshot to upload" });
      return;
    }

    setSmsProcessing(true);
    setSmsResult(null);

    try {
      const formData = new FormData();
      formData.append("image", smsScreenshot);

      const response = await fetch("/api/sms/analyze-screenshot", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.hasEvent && data.events && data.events.length > 0) {
        // Create unconfirmed events for each detected event
        for (const event of data.events) {
          await createEvent({
            familyId: convexUser!.familyId,
            title: event.title,
            date: event.date,
            time: event.time,
            endTime: event.endTime,
            location: event.location,
            category: event.category || "other",
            childName: Array.from(selectedMembers).join(", ") || undefined,
            description: event.description,
            confirmed: false, // Add to inbox for review
          });
        }

        setSmsResult({
          success: true,
          message: `Found ${data.events.length} event(s). Check your inbox to review!`,
          confidence: data.confidence,
          cost: data.usage ? `~${Math.round(data.usage.total_tokens / 1000)}K tokens used` : undefined,
        });
        setSmsScreenshot(null);
        setSelectedMembers(new Set());
        setTimeout(() => {
          setShowUploadSMSModal(false);
          setSmsResult(null);
        }, 3000);
      } else if (response.ok && !data.hasEvent) {
        setSmsResult({
          success: false,
          message: `No events found in screenshot. ${data.explanation || ""}`,
        });
      } else {
        setSmsResult({ error: data.error || "Failed to analyze screenshot" });
      }
    } catch (error: any) {
      console.error("Screenshot analysis error:", error);
      setSmsResult({ error: "Failed to process screenshot" });
    } finally {
      setSmsProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high": return "bg-green-100 text-green-800 border-green-300";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

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
            <Link href="/events" className="text-gray-600 hover:text-gray-900">
              Events
            </Link>
            <Link
              href="/inbox"
              className="text-indigo-600 font-medium relative"
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
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="flex flex-col py-2">
              <Link href="/events" className="px-4 py-3 text-gray-600 hover:bg-gray-50">
                Events
              </Link>
              <Link href="/inbox" className="px-4 py-3 text-indigo-600 font-medium bg-indigo-50 relative">
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
              <button onClick={() => signOut()} className="px-4 py-3 text-left text-gray-600 hover:bg-gray-50">
                Log Out
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Inbox
          </h1>
          <p className="text-gray-600">
            Review and confirm events found in your emails, or add new events manually
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => setShowAddEventModal(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span>
            Add Event Manually
          </button>
          <button
            onClick={handleScanEmail}
            disabled={isScanning || !gmailAccounts || gmailAccounts.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>📧</span>
            {isScanning ? "Scanning..." : "Scan Emails"}
          </button>
          <button
            onClick={() => setShowPasteSMSModal(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
          >
            <span>💬</span>
            Paste SMS Text
          </button>
          <button
            onClick={() => setShowUploadSMSModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            <span>📸</span>
            Upload Screenshot
          </button>
        </div>

        {/* Scan Status Message */}
        {scanMessage && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            {scanMessage}
          </div>
        )}

        {/* Stats Banner */}
        <div className="bg-indigo-50 rounded-lg p-4 sm:p-6 mb-6 border border-indigo-200">
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
                    : "Our AI found these in your recent emails. Please confirm or edit them."}
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
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
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
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                      >
                        Select All
                      </button>
                      <button
                        onClick={async () => {
                          for (const event of unconfirmedEvents) {
                            await handleApprove(event._id);
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
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
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-500">Loading events...</div>
          </div>
        ) : unconfirmedEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              All caught up!
            </h2>
            <p className="text-gray-600 mb-6">
              No events need review right now. We'll notify you when new events are found.
            </p>
            <button
              onClick={() => setShowAddEventModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Add Event Manually
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {unconfirmedEvents.map((event) => (
              <div key={event._id} className="bg-white rounded-lg shadow-md border-2 border-yellow-200">
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
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {event.title}
                        </h3>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 mb-3">
                        <span>{event.eventDate}</span>
                        {event.eventTime && (
                          <span>{formatTime12Hour(event.eventTime)} {event.endTime && `- ${formatTime12Hour(event.endTime)}`}</span>
                        )}
                        {event.location && (
                          <span>{event.location}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {event.childName && (() => {
                          const firstName = event.childName.split(",")[0].trim();
                          const member = familyMembers?.find(m => m.name === firstName);
                          const color = member?.color || "#6366f1";
                          return (
                            <div
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                              style={{ backgroundColor: color }}
                            >
                              {event.childName}
                            </div>
                          );
                        })()}
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
                    <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                      <div className="font-medium text-blue-900 mb-1">Details:</div>
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
                        {event.sourceEmailSubject && (
                          <a
                            href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`subject:"${event.sourceEmailSubject}"`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition font-medium whitespace-nowrap self-start"
                            title="Opens Gmail search - will search across all your logged-in Gmail accounts"
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

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleApprove(event._id)}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                    >
                      Approve & Add to Calendar
                    </button>
                    <button
                      onClick={() => handleEdit(event)}
                      className="px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleReject(event._id)}
                      className="px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      name="eventDate"
                      defaultValue={editingEvent.eventDate}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Family Members
                    </label>
                    <div className="space-y-2">
                      {/* All Family Members option */}
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editSelectedMembers.has("all")}
                          onChange={(e) => {
                            const newSet = new Set<string>();
                            if (e.target.checked) {
                              newSet.add("all");
                            }
                            setEditSelectedMembers(newSet);
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-900">All Family Members</span>
                      </label>

                      {/* Individual family member checkboxes */}
                      {familyMembers && familyMembers.length > 0 && (
                        <div className="pl-6 space-y-2 border-l-2 border-gray-200">
                          {familyMembers.map((member) => (
                            <label key={member._id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editSelectedMembers.has(member.name) && !editSelectedMembers.has("all")}
                                disabled={editSelectedMembers.has("all")}
                                onChange={(e) => {
                                  const newSet = new Set(editSelectedMembers);
                                  newSet.delete("all"); // Remove "all" if user selects individuals
                                  if (e.target.checked) {
                                    newSet.add(member.name);
                                  } else {
                                    newSet.delete(member.name);
                                  }
                                  setEditSelectedMembers(newSet);
                                }}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                              />
                              <span className="text-sm text-gray-700">{member.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditEventModal(false);
                      setEditingEvent(null);
                      setEditSelectedMembers(new Set());
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

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Add Event Manually</h2>
              <button
                onClick={() => {
                  setShowAddEventModal(false);
                  setSelectedMembers(new Set());
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g., Soccer Practice"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      name="eventDate"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Family Members
                    </label>
                    <div className="space-y-2">
                      {/* All Family Members option */}
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMembers.has("all")}
                          onChange={(e) => {
                            const newSet = new Set<string>();
                            if (e.target.checked) {
                              newSet.add("all");
                            }
                            setSelectedMembers(newSet);
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-900">All Family Members</span>
                      </label>

                      {/* Individual family member checkboxes */}
                      {familyMembers && familyMembers.length > 0 && (
                        <div className="pl-6 space-y-2 border-l-2 border-gray-200">
                          {familyMembers.map((member) => (
                            <label key={member._id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedMembers.has(member.name) && !selectedMembers.has("all")}
                                disabled={selectedMembers.has("all")}
                                onChange={(e) => {
                                  const newSet = new Set(selectedMembers);
                                  newSet.delete("all"); // Remove "all" if user selects individuals
                                  if (e.target.checked) {
                                    newSet.add(member.name);
                                  } else {
                                    newSet.delete(member.name);
                                  }
                                  setSelectedMembers(newSet);
                                }}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                              />
                              <span className="text-sm text-gray-700">{member.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    placeholder="e.g., West Field"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select name="category" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent">
                    <option>Sports</option>
                    <option>Lessons</option>
                    <option>School</option>
                    <option>Appointments</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Any additional details..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                  >
                    Add Event
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEventModal(false);
                      setSelectedMembers(new Set());
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

      {/* Paste SMS Text Modal */}
      {showPasteSMSModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">📱 Paste SMS Text</h2>
              <p className="text-gray-600 mb-6">
                Copy a text message from your phone and paste it here. Our AI will extract event information automatically.
              </p>

              {smsResult && (
                <div
                  className={`mb-4 p-4 rounded-lg border ${
                    smsResult.error
                      ? "bg-red-50 border-red-200 text-red-800"
                      : smsResult.success
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-yellow-50 border-yellow-200 text-yellow-800"
                  }`}
                >
                  <p className="font-semibold">{smsResult.message || smsResult.error}</p>
                  {smsResult.confidence && (
                    <p className="text-sm mt-1">
                      Confidence: <span className="font-medium capitalize">{smsResult.confidence}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMS Text *
                  </label>
                  <textarea
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    placeholder="Example: 'Don't forget - Emily's birthday party next Sunday at 2pm at Chuck E Cheese!'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={6}
                    disabled={smsProcessing}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Works best with messages that include event name, date/time, and location
                  </p>
                </div>

                {familyMembers && familyMembers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign to Family Member (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {familyMembers.map((member) => (
                        <label key={member._id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMembers.has(member.name)}
                            onChange={(e) => {
                              const newSet = new Set(selectedMembers);
                              if (e.target.checked) {
                                newSet.add(member.name);
                              } else {
                                newSet.delete(member.name);
                              }
                              setSelectedMembers(newSet);
                            }}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            disabled={smsProcessing}
                          />
                          <span className="text-sm">{member.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handlePasteSMS}
                  disabled={smsProcessing || !smsText.trim()}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {smsProcessing ? "Analyzing..." : "Extract Event"}
                </button>
                <button
                  onClick={() => {
                    setShowPasteSMSModal(false);
                    setSmsText("");
                    setSmsResult(null);
                    setSelectedMembers(new Set());
                  }}
                  disabled={smsProcessing}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload SMS Screenshot Modal */}
      {showUploadSMSModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">📸 Upload SMS Screenshot</h2>
              <p className="text-gray-600 mb-6">
                Take a screenshot of your text messages and upload it here. Our AI will read and extract event information.
              </p>

              {smsResult && (
                <div
                  className={`mb-4 p-4 rounded-lg border ${
                    smsResult.error
                      ? "bg-red-50 border-red-200 text-red-800"
                      : smsResult.success
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-yellow-50 border-yellow-200 text-yellow-800"
                  }`}
                >
                  <p className="font-semibold">{smsResult.message || smsResult.error}</p>
                  {smsResult.confidence && (
                    <p className="text-sm mt-1">
                      Confidence: <span className="font-medium capitalize">{smsResult.confidence}</span>
                    </p>
                  )}
                  {smsResult.cost && (
                    <p className="text-xs mt-1 text-gray-600">{smsResult.cost}</p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Screenshot Image *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSmsScreenshot(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={smsProcessing}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supports PNG, JPEG, WEBP. For best results, ensure text is clear and readable.
                  </p>
                  {smsScreenshot && (
                    <p className="text-sm text-gray-700 mt-2">
                      Selected: {smsScreenshot.name} ({Math.round(smsScreenshot.size / 1024)}KB)
                    </p>
                  )}
                </div>

                {familyMembers && familyMembers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign to Family Member (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {familyMembers.map((member) => (
                        <label key={member._id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMembers.has(member.name)}
                            onChange={(e) => {
                              const newSet = new Set(selectedMembers);
                              if (e.target.checked) {
                                newSet.add(member.name);
                              } else {
                                newSet.delete(member.name);
                              }
                              setSelectedMembers(newSet);
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            disabled={smsProcessing}
                          />
                          <span className="text-sm">{member.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Cost:</strong> This feature uses GPT-4 Vision and costs approximately $0.01-0.02 per screenshot.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUploadScreenshot}
                  disabled={smsProcessing || !smsScreenshot}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {smsProcessing ? "Analyzing..." : "Analyze Screenshot"}
                </button>
                <button
                  onClick={() => {
                    setShowUploadSMSModal(false);
                    setSmsScreenshot(null);
                    setSmsResult(null);
                    setSelectedMembers(new Set());
                  }}
                  disabled={smsProcessing}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
