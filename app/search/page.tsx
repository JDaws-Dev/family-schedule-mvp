"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "../components/Toast";
import MobileNav from "../components/MobileNav";
import BottomNav from "../components/BottomNav";
import FAB from "../components/FAB";
import PhotoUploadModal from "../components/PhotoUploadModal";
import VoiceRecordModal from "../components/VoiceRecordModal";
import BrowseCalendarsModal from "../components/BrowseCalendarsModal";
import { ButtonSpinner } from "../components/LoadingSpinner";

export default function SearchPage() {
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active search type
  const [activeSearchType, setActiveSearchType] = useState<"emails" | "calendars" | "local" | null>(null);

  // Email Search State
  const [emailSearchQuery, setEmailSearchQuery] = useState("");
  const [emailSearchTimeframe, setEmailSearchTimeframe] = useState("3");
  const [emailSearching, setEmailSearching] = useState(false);
  const [emailList, setEmailList] = useState<any[]>([]);
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [isExtractingEvents, setIsExtractingEvents] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState<any[]>([]);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  // Calendar Search State
  const [showBrowseCalendarsModal, setShowBrowseCalendarsModal] = useState(false);

  // Local Events Search State
  const [location, setLocation] = useState("");
  const [distance, setDistance] = useState(15);
  const [discoveryKeyword, setDiscoveryKeyword] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [localActivities, setLocalActivities] = useState<any[]>([]);

  // Modals for FAB
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [showVoiceRecordModal, setShowVoiceRecordModal] = useState(false);

  // Get current user from Convex
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Get family data
  const family = useQuery(
    api.families.getFamilyById,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get Gmail accounts
  const gmailAccounts = useQuery(
    api.gmailAccounts.getFamilyGmailAccounts,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get linked calendars
  const linkedCalendars = useQuery(
    api.linkedCalendars.getLinkedCalendars,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get family members for event editing
  const familyMembers = useQuery(
    api.familyMembers.getFamilyMembers,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  const discoverActivities = useAction(api.activities.discoverActivities);
  const createEvent = useMutation(api.events.createEvent);

  // Email Search Handler - List emails
  const handleEmailSearch = async () => {
    if (!emailSearchQuery.trim()) return;

    setEmailSearching(true);
    setActiveSearchType("emails");
    setEmailList([]);
    setSelectedEmailIds(new Set());
    setExtractedEvents([]);
    setExpandedEmailId(null);

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

      if (response.ok) {
        setEmailList(data.emails || []);
        showToast(
          `Found ${data.emails?.length || 0} ${data.emails?.length === 1 ? 'email' : 'emails'}`,
          "success"
        );
      } else {
        showToast(data.error || "Search failed", "error");
      }
    } catch (error) {
      console.error("Email search error:", error);
      showToast("Failed to search emails", "error");
    } finally {
      setEmailSearching(false);
    }
  };

  // Extract events from selected emails
  const handleExtractEvents = async () => {
    if (selectedEmailIds.size === 0) {
      showToast("Please select at least one email", "error");
      return;
    }

    setIsExtractingEvents(true);

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

      if (response.ok) {
        setExtractedEvents(data.events || []);
        showToast(
          `Extracted ${data.events?.length || 0} ${data.events?.length === 1 ? 'event' : 'events'}!`,
          "success"
        );
      } else {
        showToast(data.error || "Failed to extract events", "error");
      }
    } catch (error) {
      console.error("Extract events error:", error);
      showToast("Failed to extract events", "error");
    } finally {
      setIsExtractingEvents(false);
    }
  };

  // Toggle email selection
  const toggleEmailSelection = (emailId: string) => {
    const newSelected = new Set(selectedEmailIds);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmailIds(newSelected);
  };

  // Local Activities Search Handler
  const handleLocalSearch = async () => {
    if (!location.trim()) {
      showToast("Please enter a location", "error");
      return;
    }

    setIsDiscovering(true);
    setActiveSearchType("local");

    try {
      const result = await discoverActivities({
        familyId: convexUser!.familyId,
        location: location,
        radius: distance,
        keyword: discoveryKeyword || undefined,
      });

      if (result.success) {
        setLocalActivities(result.activities || []);
        showToast(
          `Found ${result.activities?.length || 0} activities near ${location}`,
          "success"
        );
      } else {
        showToast(result.error || "Discovery failed", "error");
      }
    } catch (error) {
      console.error("Local discovery error:", error);
      showToast("Failed to discover activities", "error");
    } finally {
      setIsDiscovering(false);
    }
  };

  const hasGmail = gmailAccounts && gmailAccounts.length > 0;
  const hasLinkedCalendars = linkedCalendars && linkedCalendars.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-accent-600">
            nufamly
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-700 hover:text-accent-600 font-medium">
              Dashboard
            </Link>
            <Link href="/review" className="text-gray-700 hover:text-accent-600 font-medium">
              Review Events
            </Link>
            <Link href="/calendar" className="text-gray-700 hover:text-accent-600 font-medium">
              Calendar
            </Link>
            <Link href="/search" className="text-accent-600 font-medium">
              Search
            </Link>
            <Link href="/settings" className="text-gray-700 hover:text-accent-600 font-medium">
              Settings
            </Link>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Sign Out
            </button>
          </nav>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <MobileNav
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        currentPage="search"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Search
          </h1>
          <p className="text-gray-600 text-lg">
            Find what you need, fast - search your emails, browse linked calendars, or discover local activities
          </p>
        </div>

        {/* Three Search Options */}
        <div className="space-y-6">

          {/* 1. Search Your Emails */}
          <div id="search-emails" className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden scroll-mt-8">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Search Your Emails
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    AI searches your connected emails for any event, schedule, or activity information. No more digging through your inbox!
                  </p>

                  {!hasGmail ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-900 mb-3">
                        Connect your email to unlock AI-powered email search
                      </p>
                      <Link
                        href="/settings?tab=apps"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                      >
                        Connect Gmail
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          What are you looking for?
                        </label>
                        <input
                          type="text"
                          value={emailSearchQuery}
                          onChange={(e) => setEmailSearchQuery(e.target.value)}
                          placeholder="e.g., 'baseball schedule', 'soccer registration', 'piano recital'..."
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onKeyPress={(e) => e.key === 'Enter' && !emailSearching && emailSearchQuery.trim() && handleEmailSearch()}
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
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="1">Last month</option>
                            <option value="3">Last 3 months (Recommended)</option>
                            <option value="6">Last 6 months</option>
                            <option value="12">Last year</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={handleEmailSearch}
                            disabled={emailSearching || !emailSearchQuery.trim()}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 whitespace-nowrap"
                          >
                            {emailSearching ? (
                              <>
                                <ButtonSpinner />
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
                      </div>

                      <p className="text-xs text-gray-500">
                        💡 Tip: Be specific! Try "baseball practice schedule" or "soccer team registration"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Email List Results */}
              {activeSearchType === "emails" && emailList.length > 0 && !extractedEvents.length && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">
                      Found {emailList.length} {emailList.length === 1 ? 'email' : 'emails'} - Select emails to extract events from:
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedEmailIds(new Set(emailList.map(e => e.id)))}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                    {emailList.map((email) => (
                      <div key={email.id} className="border border-gray-200 rounded-lg">
                        {/* Email Summary - Always visible */}
                        <div
                          className={`p-4 transition cursor-pointer ${
                            selectedEmailIds.has(email.id)
                              ? 'bg-blue-50 border-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleEmailSelection(email.id)}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedEmailIds.has(email.id)}
                              onChange={() => {}}
                              className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{email.subject}</h4>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {email.date ? new Date(email.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">From: {email.from}</p>
                              {email.snippet && (
                                <p className="text-sm text-gray-500 line-clamp-2">{email.snippet}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {email.accountEmail && (
                                  <p className="text-xs text-primary-500">📧 {email.accountEmail}</p>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedEmailId(expandedEmailId === email.id ? null : email.id);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium ml-auto"
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
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{email.snippet || 'No email body available'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Extract Button - Fixed at bottom */}
                  {selectedEmailIds.size > 0 && (
                    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg sticky bottom-0">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">{selectedEmailIds.size}</span> email(s) selected
                      </p>
                      <button
                        onClick={handleExtractEvents}
                        disabled={isExtractingEvents}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-soft flex items-center gap-2"
                      >
                        {isExtractingEvents ? (
                          <>
                            <ButtonSpinner />
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

              {/* Extracted Events */}
              {extractedEvents.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Extracted Events ({extractedEvents.length})
                  </h2>

                  <div className="space-y-3">
                    {extractedEvents.map((event, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
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
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition whitespace-nowrap"
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
          </div>

          {/* 2. Browse Linked Calendars */}
          <div id="browse-calendars" className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden scroll-mt-8">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Browse Linked Calendars
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    View and import events from school, team, and organization calendars you've linked. Never miss a school holiday or team game again!
                  </p>

                  {!hasLinkedCalendars ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-purple-900 mb-3">
                        Link calendars to automatically see upcoming school holidays, games, and events
                      </p>
                      <Link
                        href="/settings?tab=calendars"
                        className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
                      >
                        Link Calendars
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-sm text-purple-900 font-medium mb-1">
                          {linkedCalendars.length} {linkedCalendars.length === 1 ? 'calendar' : 'calendars'} linked
                        </p>
                        <p className="text-xs text-purple-700">
                          {linkedCalendars.map((cal: any) => cal.name).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowBrowseCalendarsModal(true)}
                        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Browse Calendar Events
                      </button>
                      <p className="text-xs text-gray-500">
                        💡 Tip: Pick and choose which events to add to your family calendar
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Search Local Activities */}
          <div id="local-activities" className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden scroll-mt-8">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Search Local Activities
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Discover parks, museums, classes, camps, and events near you. Personalized based on your family's interests!
                  </p>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter your city or ZIP code"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />

                    <button
                      type="button"
                      onClick={() => setFiltersExpanded(!filtersExpanded)}
                      className="text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      {filtersExpanded ? "Hide" : "Show"} Advanced Options
                    </button>

                    {filtersExpanded && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Search Radius
                            </label>
                            <select
                              value={distance}
                              onChange={(e) => setDistance(Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Keyword (optional)
                            </label>
                            <input
                              type="text"
                              value={discoveryKeyword}
                              onChange={(e) => setDiscoveryKeyword(e.target.value)}
                              placeholder="e.g., soccer, art"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleLocalSearch}
                      disabled={isDiscovering || !location.trim()}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      {isDiscovering ? (
                        <>
                          <ButtonSpinner />
                          Searching...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Search Near Me
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500">
                      💡 Tip: Results are personalized based on your family's interests
                    </p>
                  </div>
                </div>
              </div>

              {/* Local Activities Results */}
              {activeSearchType === "local" && localActivities.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Found {localActivities.length} {localActivities.length === 1 ? 'activity' : 'activities'} near {location}
                  </h3>
                  <div className="space-y-3">
                    {localActivities.slice(0, 10).map((activity, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <p className="font-medium text-gray-900">{activity.name}</p>
                        <p className="text-sm text-gray-600">{activity.location}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      {showBrowseCalendarsModal && convexUser && (
        <BrowseCalendarsModal
          onClose={() => setShowBrowseCalendarsModal(false)}
          familyId={convexUser.familyId}
          userId={convexUser._id}
        />
      )}

      {showPhotoUploadModal && (
        <PhotoUploadModal
          onClose={() => setShowPhotoUploadModal(false)}
          onExtract={() => {
            setShowPhotoUploadModal(false);
            showToast("Event extracted from photo!", "success");
          }}
        />
      )}

      {showVoiceRecordModal && (
        <VoiceRecordModal
          onClose={() => setShowVoiceRecordModal(false)}
          onTranscribe={(text) => {
            setShowVoiceRecordModal(false);
            showToast("Event extracted from voice!", "success");
          }}
        />
      )}

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
                const eventId = await createEvent({
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

                console.log("Event created successfully:", eventId);
                showToast("Event added to calendar!", "success");

                // Remove from extracted events by comparing the actual event object
                const eventIndex = extractedEvents.findIndex(e =>
                  e.title === editingEvent.title &&
                  e.eventDate === editingEvent.eventDate
                );
                if (eventIndex !== -1) {
                  setExtractedEvents(extractedEvents.filter((_, i) => i !== eventIndex));
                }

                setEditingEvent(null);
              } catch (error: any) {
                console.error("Failed to add event:", error);
                showToast(error?.message || "Failed to add event. Please try again.", "error");
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
                    <option value="Sports">Sports</option>
                    <option value="School">School</option>
                    <option value="Medical">Medical</option>
                    <option value="Social">Social</option>
                    <option value="Appointment">Appointment</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Other">Other</option>
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

      {/* Bottom Navigation - Mobile */}
      <BottomNav />

      {/* FAB - Simplified (only add event options) */}
      <FAB
        onAction={(action) => {
          if (action === "photo") setShowPhotoUploadModal(true);
          else if (action === "voice") setShowVoiceRecordModal(true);
        }}
      />
    </div>
  );
}
