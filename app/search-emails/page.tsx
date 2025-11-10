"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SearchEmailsPage() {
  const router = useRouter();
  const convexUser = useQuery(api.users.getCurrentUser);
  const familyMembers = useQuery(api.familyMembers.list);
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

  if (!convexUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
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

        {/* TODO: Add extracted events section and edit modal */}
      </div>

      {/* Toast */}
      {showToastMessage && (
        <div className="fixed bottom-24 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {showToastMessage.message}
        </div>
      )}
    </div>
  );

  async function handleSearch() {
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
  }

  async function handleExtractEvents() {
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
  }
}
