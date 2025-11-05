"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Dashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const { user: clerkUser } = useUser();
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

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="flex flex-col py-2">
              <Link
                href="/dashboard"
                className="px-4 py-3 text-indigo-600 font-medium bg-indigo-50"
              >
                Dashboard
              </Link>
              <Link
                href="/calendar"
                className="px-4 py-3 text-gray-600 hover:bg-gray-50"
              >
                Calendar
              </Link>
              <Link
                href="/review"
                className="px-4 py-3 text-gray-600 hover:bg-gray-50"
              >
                Review
              </Link>
              <Link
                href="/discover"
                className="px-4 py-3 text-gray-600 hover:bg-gray-50"
              >
                Discover
              </Link>
              <Link
                href="/settings"
                className="px-4 py-3 text-gray-600 hover:bg-gray-50"
              >
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your family schedule
          </p>
        </div>

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
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 font-medium mb-2">This Week</h3>
            <p className="text-3xl font-bold text-gray-900">
              {weekEvents === undefined ? "-" : weekEvents.length}
            </p>
            <p className="text-sm text-gray-500">Upcoming events</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 font-medium mb-2">Needs Action</h3>
            <p className="text-3xl font-bold text-gray-900">
              {weekEvents === undefined
                ? "-"
                : weekEvents.filter((e) => e.requiresAction).length}
            </p>
            <p className="text-sm text-gray-500">Forms & payments due</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 font-medium mb-2">To Review</h3>
            <p className="text-3xl font-bold text-gray-900">
              {unconfirmedEvents === undefined ? "-" : unconfirmedEvents.length}
            </p>
            <p className="text-sm text-gray-500">New events found</p>
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
                  <div className="p-8 text-center">
                    <p className="text-gray-600 mb-2">No upcoming events</p>
                    <p className="text-sm text-gray-500">
                      {isGmailConnected
                        ? "Scan your email to find events"
                        : "Connect your Gmail to get started"}
                    </p>
                  </div>
                ) : (
                  upcomingEvents.map((event) => (
                    <div
                      key={event._id}
                      className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
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
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  href="/review"
                  className="w-full text-left px-4 py-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                >
                  <div className="font-semibold text-gray-900">
                    Add Event
                  </div>
                  <div className="text-xs text-gray-600">
                    Manually add an event
                  </div>
                </Link>

                <button
                  onClick={handleScanEmail}
                  disabled={isScanning || !isGmailConnected}
                  className="w-full text-left px-4 py-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="font-semibold text-gray-900">
                    {isScanning ? "Scanning..." : "Scan Email"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {scanMessage || "Check for new events"}
                  </div>
                </button>

                <Link
                  href="/settings"
                  className="block w-full text-left px-4 py-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                >
                  <div className="font-semibold text-gray-900">
                    Settings
                  </div>
                  <div className="text-xs text-gray-600">
                    Manage preferences
                  </div>
                </Link>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
              <h3 className="font-bold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Check out our guides or contact support anytime.
              </p>
              <a href="mailto:support@familyschedule.com" className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                Contact Support →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
