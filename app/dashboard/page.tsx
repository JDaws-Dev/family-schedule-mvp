"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "../components/Toast";
import { SyncStatus } from "../components/SyncStatus";

export default function Dashboard() {
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<{eventsFound: number; messagesScanned: number} | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const { user: clerkUser } = useUser();
  const { signOut} = useClerk();

  // Mutations
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

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

  // Get all events for this week
  const today = new Date().toISOString().split("T")[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const weekEvents = useQuery(
    api.events.getEventsByDateRange,
    convexUser?.familyId
      ? { familyId: convexUser.familyId, startDate: today, endDate: weekFromNow }
      : "skip"
  );

  const isGmailConnected = (gmailAccounts?.length ?? 0) > 0;

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

    // Simulate progress updates (since we can't get real progress from the backend)
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) return 90; // Stop at 90% until we get real results
        return prev + Math.random() * 15;
      });
    }, 800);

    try {
      setScanMessage("Scanning your inbox for events...");

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
            <Link
              href="/dashboard"
              className="text-indigo-600 font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/calendar"
              className="text-gray-600 hover:text-gray-900"
            >
              Calendar
            </Link>
            <Link
              href="/review"
              className="text-gray-600 hover:text-gray-900"
            >
              Review
            </Link>
            <Link
              href="/discover"
              className="text-gray-600 hover:text-gray-900"
            >
              Discover
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
                  Dashboard
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
                  Discover
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your family schedule
          </p>
        </div>

        {/* Sync Status */}
        {convexUser?.familyId && isGmailConnected && (
          <SyncStatus
            familyId={convexUser.familyId}
            onScanNow={handleScanEmail}
            isScanning={isScanning}
          />
        )}

        {/* Gmail Connection Banner */}
        {!isGmailConnected && (
          <div className="bg-indigo-600 rounded-xl p-6 mb-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  Connect Your Gmail
                </h2>
                <p className="mb-4 opacity-90 text-sm sm:text-base">
                  Let's scan your email to find all your kids' activities automatically.
                  It takes just 30 seconds!
                </p>
                <Link
                  href="/settings"
                  className="inline-block bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  Connect Gmail →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* This Week Card */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-medium p-6 text-white hover:shadow-strong transition-all duration-200 transform hover:-translate-y-1">
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
            <p className="text-sm text-white/80">Upcoming events</p>
          </div>

          {/* Needs Action Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl shadow-medium p-6 text-white hover:shadow-strong transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Action</span>
            </div>
            <h3 className="text-white/90 font-medium mb-2 text-sm">Needs Action</h3>
            <p className="text-4xl font-bold mb-1">
              {weekEvents === undefined ? (
                <span className="inline-block w-12 h-10 bg-white/20 rounded animate-pulse"></span>
              ) : weekEvents.filter((e) => e.requiresAction).length}
            </p>
            <p className="text-sm text-white/80">Forms & payments due</p>
          </div>

          {/* To Review Card */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl shadow-medium p-6 text-white hover:shadow-strong transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">New</span>
            </div>
            <h3 className="text-white/90 font-medium mb-2 text-sm">To Review</h3>
            <p className="text-4xl font-bold mb-1">
              {unconfirmedEvents === undefined ? (
                <span className="inline-block w-12 h-10 bg-white/20 rounded animate-pulse"></span>
              ) : unconfirmedEvents.length}
            </p>
            <p className="text-sm text-white/80">New events found</p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Events */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Upcoming Events
                </h2>
                <Link
                  href="/calendar"
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  View All →
                </Link>
              </div>
              <div className="divide-y divide-gray-200">
                {upcomingEvents === undefined ? (
                  <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Your calendar is empty!</h3>
                    <p className="text-gray-600 mb-6">Let's get you set up with your family's activities.</p>

                    <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                      <h4 className="font-semibold text-gray-900 mb-3">Getting started:</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Connect Gmail to automatically find events</p>
                            <p className="text-xs text-gray-600 mt-0.5">We'll scan for sports, schools, and activities</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Add events manually</p>
                            <p className="text-xs text-gray-600 mt-0.5">Quick entry for any activity or appointment</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      {!isGmailConnected ? (
                        <Link
                          href="/settings"
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19" />
                          </svg>
                          Connect Gmail
                        </Link>
                      ) : (
                        <button
                          onClick={handleScanEmail}
                          disabled={isScanning}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19" />
                          </svg>
                          Scan Email
                        </button>
                      )}
                      <Link
                        href="/review"
                        className="px-6 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Event
                      </Link>
                    </div>
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
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {event.title}
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                            <span>{event.eventDate}</span>
                            {event.eventTime && (
                              <span>{event.eventTime}</span>
                            )}
                            {event.location && (
                              <span>{event.location}</span>
                            )}
                          </div>
                        </div>
                        {event.childName && (
                          <div className="sm:ml-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {event.childName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  href="/review"
                  className="block w-full text-left px-4 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        Add Event
                      </div>
                      <div className="text-xs text-white/80">
                        Manually add an event
                      </div>
                    </div>
                  </div>
                </Link>

                <button
                  onClick={handleScanEmail}
                  disabled={isScanning || !isGmailConnected}
                  className="w-full text-left px-4 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        {isScanning ? "Scanning..." : "Scan Email"}
                      </div>
                      <div className="text-xs text-white/80">
                        {scanMessage || "Check for new events"}
                      </div>
                    </div>
                  </div>
                </button>

                <Link
                  href="/settings"
                  className="block w-full text-left px-4 py-4 bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        Settings
                      </div>
                      <div className="text-xs text-white/80">
                        Manage preferences
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-primary-50 rounded-lg p-6 border border-primary-200 mb-6">
              <h3 className="font-bold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Check out our guides or contact support anytime.
              </p>
              <a href="mailto:support@familyschedule.com" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                Contact Support →
              </a>
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-white rounded-lg shadow-soft p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Recent Activity
              </h2>
              <div className="space-y-4">
                {/* Activity items - showing mock data for now */}
                {isGmailConnected ? (
                  <>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-gray-900">Email scan completed</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {gmailAccounts?.[0]?.lastSyncAt
                            ? new Date(gmailAccounts[0].lastSyncAt).toLocaleDateString()
                            : "Today"}
                        </p>
                      </div>
                    </div>

                    {unconfirmedEvents && unconfirmedEvents.length > 0 && (
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium text-gray-900">
                            {unconfirmedEvents.length} new event{unconfirmedEvents.length !== 1 ? "s" : ""} found
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Waiting for review</p>
                        </div>
                      </div>
                    )}

                    {upcomingEvents && upcomingEvents.length > 0 && (
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium text-gray-900">
                            {upcomingEvents[0].title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Upcoming: {upcomingEvents[0].eventDate}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Gmail connected</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {gmailAccounts?.[0]?.gmailEmail}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">No recent activity</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Connect Gmail to start tracking
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button - Mobile Only */}
      <Link
        href="/review"
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-strong flex items-center justify-center text-white hover:shadow-xl transition-all duration-200 z-50 transform hover:scale-110"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      {/* Email Scan Progress Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-strong max-w-md w-full p-8 transform transition-all">
            <div className="text-center">
              {isScanning ? (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Scanning Your Emails</h3>
                  <p className="text-gray-600 mb-6">{scanMessage}</p>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500">{Math.round(scanProgress)}% complete</p>
                </>
              ) : (
                <>
                  {scanResults && scanResults.eventsFound > 0 ? (
                    <>
                      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Scan Complete!</h3>
                      <p className="text-gray-600 mb-6">{scanMessage}</p>

                      <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <p className="text-3xl font-bold text-green-600">{scanResults.eventsFound}</p>
                            <p className="text-sm text-gray-600 mt-1">Event{scanResults.eventsFound !== 1 ? "s" : ""} Found</p>
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-green-600">{scanResults.messagesScanned}</p>
                            <p className="text-sm text-gray-600 mt-1">Email{scanResults.messagesScanned !== 1 ? "s" : ""} Scanned</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                        <div className="flex gap-3">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-left">
                            <h4 className="font-semibold text-blue-900 text-sm">What's next?</h4>
                            <p className="text-sm text-blue-800 mt-1">
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setSelectedEvent(null);
            setIsEditingEvent(false);
            setEditFormData(null);
          }}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditingEvent ? "Edit Event" : selectedEvent.title}
              </h2>
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setIsEditingEvent(false);
                  setEditFormData(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {isEditingEvent ? (
              /* Edit Form */
              <div className="space-y-4">
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
                  <input
                    type="text"
                    value={editFormData?.category || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
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

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={async () => {
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
                      });
                      setSelectedEvent(null);
                      setIsEditingEvent(false);
                      setEditFormData(null);
                    }}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingEvent(false);
                      setEditFormData(null);
                    }}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 font-medium w-24">Date:</span>
                    <span className="text-gray-900">{selectedEvent.eventDate}</span>
                  </div>

                  {selectedEvent.eventTime && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-600 font-medium w-24">Time:</span>
                      <span className="text-gray-900">
                        {selectedEvent.eventTime}
                        {selectedEvent.endTime && ` - ${selectedEvent.endTime}`}
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
                      <span className="text-gray-900">{selectedEvent.childName}</span>
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
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditingEvent(true);
                      setEditFormData({
                        title: selectedEvent.title,
                        eventDate: selectedEvent.eventDate,
                        eventTime: selectedEvent.eventTime || "",
                        endTime: selectedEvent.endTime || "",
                        location: selectedEvent.location || "",
                        childName: selectedEvent.childName || "",
                        category: selectedEvent.category || "",
                        description: selectedEvent.description || "",
                      });
                    }}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Delete "${selectedEvent.title}"?`)) {
                        await deleteEvent({ eventId: selectedEvent._id });
                        setSelectedEvent(null);
                      }
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
