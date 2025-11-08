"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "../components/Toast";

export default function DiscoverPage() {
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [discoveryKeyword, setDiscoveryKeyword] = useState(""); // Keyword for AI discovery
  const [isDiscovering, setIsDiscovering] = useState(false);
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

  // Get suggested activities from database
  const dbActivities = useQuery(
    api.suggestedActivities.getSuggestedActivitiesByFamily,
    convexUser?.familyId ? { familyId: convexUser.familyId, status: "suggested" } : "skip"
  );

  // Mutations for activity actions
  const quickAddToCalendar = useMutation(api.suggestedActivities.quickAddToCalendar);
  const dismissActivity = useMutation(api.suggestedActivities.dismissActivity);
  const updateFamilyLocation = useMutation(api.families.updateFamilyLocation);

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

  const handleDismiss = async (activityId: any) => {
    try {
      await dismissActivity({ activityId });
      showToast("Activity dismissed", "info");
    } catch (error: any) {
      console.error("Error dismissing activity:", error);
      showToast("Failed to dismiss activity. Please try again.", "error");
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
        .filter(Boolean)
    )
  ).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            Our Daily Family
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Home</Link>
            <Link href="/calendar" className="text-gray-600 hover:text-gray-900">Calendar</Link>
            <Link href="/review" className="text-gray-600 hover:text-gray-900">Review Events</Link>
            <Link href="/discover" className="text-primary-600 font-medium">Find Activities</Link>
            <Link href="/settings" className="text-gray-600 hover:text-gray-900">Settings</Link>
            <button onClick={() => signOut()} className="text-gray-600 hover:text-gray-900">Log Out</button>
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-2xl text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="flex flex-col py-2">
              <Link href="/dashboard" className="px-4 py-3 text-gray-600 hover:bg-gray-50">Home</Link>
              <Link href="/calendar" className="px-4 py-3 text-gray-600 hover:bg-gray-50">Calendar</Link>
              <Link href="/review" className="px-4 py-3 text-gray-600 hover:bg-gray-50">Review Events</Link>
              <Link href="/discover" className="px-4 py-3 text-primary-600 font-medium bg-primary-50">Find Activities</Link>
              <Link href="/settings" className="px-4 py-3 text-gray-600 hover:bg-gray-50">Settings</Link>
              <button onClick={() => signOut()} className="px-4 py-3 text-left text-gray-600 hover:bg-gray-50">Log Out</button>
            </nav>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Discover Local Activities
          </h1>
          <p className="text-gray-600">
            Local events and activities handpicked for your family
          </p>
        </div>

        {/* What is Discover? Explanation - Always visible but compact when they have results */}
        {suggestedActivities.length === 0 ? (
          // Full explanation for first-time users
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-strong p-8 mb-8 text-white">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-4xl">✨</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3">What is Discover?</h2>
                <p className="text-primary-50 leading-relaxed mb-4">
                  Discover automatically finds local events, classes, camps, and activities near you —
                  saving you hours of searching through multiple websites and calendars.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="font-semibold mb-1">Personalized</div>
                    <div className="text-sm text-primary-100">Matched to your family's ages and interests</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-2xl mb-2">📍</div>
                    <div className="font-semibold mb-1">Local</div>
                    <div className="text-sm text-primary-100">Activities within your chosen distance</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-2xl mb-2">⚡</div>
                    <div className="font-semibold mb-1">One Click</div>
                    <div className="text-sm text-primary-100">Add to your calendar instantly</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Compact reminder for returning users
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <p className="text-sm text-primary-900">
                  <span className="font-semibold">Discover</span> searches local parks & rec, libraries, museums, and event sites to find activities personalized for your family.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Discovery Banner */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-8 mb-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {suggestedActivities.length > 0 ? 'Search for More Activities' : 'Start Discovering'}
                </h2>
                <p className="text-gray-600 text-base leading-relaxed mb-2">
                  {suggestedActivities.length > 0
                    ? 'Want to see more? Update your search criteria below to find additional activities.'
                    : 'Set your location and date range to find events, classes, sports leagues, camps, and more.'}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                  <span className="flex items-center gap-1">
                    <span>💡</span>
                    <span>We search parks & rec, libraries, museums, and local event sites</span>
                  </span>
                </div>
              </div>
              <div className="text-5xl ml-6 hidden sm:block opacity-20">🎯</div>
            </div>

            {/* Location and Distance Controls */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State or ZIP code"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Search Radius
                  </label>
                  <select
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">When to start looking</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">How far ahead to search</p>
                </div>
              </div>

              {/* Discovery Keyword */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  What are you looking for? (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={discoveryKeyword}
                    onChange={(e) => setDiscoveryKeyword(e.target.value)}
                    placeholder="e.g., Christmas lights, STEM activities, soccer leagues, art classes..."
                    className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
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
                <p className="text-xs text-gray-500 mt-1.5">
                  💡 Help the AI find specific types of activities - leave blank for general search
                </p>
              </div>

              <button
                onClick={handleDiscoverActivities}
                disabled={isDiscovering || !location}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDiscovering ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Discovering Activities...
                  </span>
                ) : !location ? (
                  "⬆️ Enter Location to Start"
                ) : (
                  "🔍 Discover Activities"
                )}
              </button>
              {!location && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  💡 Tip: Enter your city or ZIP code above to get started
                </p>
              )}

              {isDiscovering && discoveryMessage && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {discoveryMessage}
                  </p>
                </div>
              )}

              {!isDiscovering && discoveryMessage && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  discoveryMessage.includes('Success')
                    ? 'bg-green-50 border-green-200'
                    : discoveryMessage.includes('Error')
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    discoveryMessage.includes('Success')
                      ? 'text-green-800'
                      : discoveryMessage.includes('Error')
                      ? 'text-red-800'
                      : 'text-blue-800'
                  }`}>{discoveryMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter results... (e.g., Christmas, STEM, soccer)"
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
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="sm:w-64">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
            >
              <option value="all">All Categories ({suggestedActivities.length})</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat?.toLowerCase()}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

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
                <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4 opacity-40">🔍</div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    No activities found
                    {searchKeyword && ` for "${searchKeyword}"`}
                    {filter !== "all" && ` in ${filter}`}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your search or category filters.
                  </p>
                  <div className="flex gap-3 justify-center">
                    {searchKeyword && (
                      <button
                        onClick={() => setSearchKeyword("")}
                        className="px-6 py-2.5 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                      >
                        Clear Search
                      </button>
                    )}
                    {filter !== "all" && (
                      <button
                        onClick={() => setFilter("all")}
                        className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                      >
                        View All Categories
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredActivities.map((activity) => (
                <div key={activity._id} className="bg-white rounded-2xl shadow-soft hover:shadow-medium transition-all border border-gray-200">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(activity.category)}`}>
                            {activity.category}
                          </span>
                          {activity.ageRange && (
                            <span className="text-sm text-gray-600">
                              {activity.ageRange}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {activity.title}
                        </h3>

                        {/* Source and Updated Info */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          {(activity.website || activity.sourceUrl) && (
                            <>
                              <a
                                href={activity.website || activity.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                              >
                                {activity.website ? 'View Event Details' : `From ${activity.sourceName || (() => {
                                  try {
                                    const hostname = new URL(activity.sourceUrl).hostname;
                                    return hostname.replace('www.', '').split('.')[0];
                                  } catch {
                                    return 'web';
                                  }
                                })()}`}
                              </a>
                              {activity.sourceLocation && (
                                <>
                                  <span>in</span>
                                  <span className="font-medium">{activity.sourceLocation}</span>
                                </>
                              )}
                              <span>•</span>
                            </>
                          )}
                          <span>Updated {(() => {
                            const now = Date.now();
                            const suggested = activity.suggestedAt;
                            const diff = now - suggested;
                            const hours = Math.floor(diff / (1000 * 60 * 60));
                            const days = Math.floor(hours / 24);

                            if (days === 0) return 'today';
                            if (days === 1) return 'yesterday';
                            if (days < 7) return `${days} days ago`;
                            if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
                            return `${Math.floor(days / 30)} months ago`;
                          })()}</span>
                        </div>

                        {/* Date and Time Row */}
                        {(activity.date || activity.time) && (
                          <div className="flex items-center gap-3 text-sm font-medium text-gray-900 mb-2">
                            {activity.date && (
                              <span className="flex items-center gap-1">
                                📅 {new Date(activity.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: new Date(activity.date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                })}
                              </span>
                            )}
                            {activity.time && (
                              <span className="flex items-center gap-1">
                                🕐 {(() => {
                                  const [hours, minutes] = activity.time.split(':');
                                  const hour = parseInt(hours);
                                  const ampm = hour >= 12 ? 'PM' : 'AM';
                                  const displayHour = hour % 12 || 12;
                                  return `${displayHour}:${minutes} ${ampm}`;
                                })()}
                                {activity.endTime && ` - ${(() => {
                                  const [hours, minutes] = activity.endTime.split(':');
                                  const hour = parseInt(hours);
                                  const ampm = hour >= 12 ? 'PM' : 'AM';
                                  const displayHour = hour % 12 || 12;
                                  return `${displayHour}:${minutes} ${ampm}`;
                                })()}`}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                          {activity.distance && (
                            <span className="flex items-center gap-1">
                              📍 {activity.distance} mi away
                            </span>
                          )}
                          {activity.rating && (
                            <span className="flex items-center gap-1">
                              ⭐ {activity.rating}
                            </span>
                          )}
                          {activity.priceRange && (
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-semibold">
                              {getPriceLabel(activity.priceRange)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {activity.description && (
                      <p className="text-gray-700 mb-4">
                        {activity.description}
                      </p>
                    )}

                    {/* Why We Recommend This */}
                    {activity.aiSummary && (
                      <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">💡</span>
                          <div>
                            <div className="text-xs font-semibold text-primary-900 mb-1 uppercase tracking-wide">
                              Why We Recommend This
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {activity.aiSummary}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Location & Contact */}
                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      {activity.location && (
                        <div className="flex items-start gap-2">
                          <span>📍</span>
                          <div>
                            <div className="font-medium text-gray-900">{activity.location}</div>
                            {activity.address && <div>{activity.address}</div>}
                          </div>
                        </div>
                      )}
                      {activity.website && (
                        <div className="flex items-center gap-2">
                          <span>🌐</span>
                          <a href={activity.website.startsWith('http') ? activity.website : `https://${activity.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {activity.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      {activity.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <span>📞</span>
                          <a href={`tel:${activity.phoneNumber}`} className="text-blue-600 hover:underline">{activity.phoneNumber}</a>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleAddToCalendar(activity._id)}
                        className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-soft"
                      >
                        📅 Add to Calendar
                      </button>
                      <button
                        onClick={() => handleDismiss(activity._id)}
                        className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            );
          })()
        ) : (
          /* Empty State - Show Examples */
          <div className="bg-white rounded-2xl shadow-soft border border-gray-200 overflow-hidden">
            <div className="p-12 text-center border-b border-gray-200">
              <div className="text-7xl mb-6 opacity-40">🔍</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Ready to Discover Activities?
              </h2>
              <p className="text-gray-600 mb-6 max-w-xl mx-auto leading-relaxed">
                Enter your location above and we'll search local sources to find events and activities for your family.
              </p>
            </div>

            {/* Example Activities Preview */}
            <div className="bg-gray-50 p-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center uppercase tracking-wide">
                Example Activities We Find:
              </h3>
              <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⚽</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">Sports</span>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm">Youth Soccer League</div>
                  <div className="text-xs text-gray-500 mt-1">Parks & Rec • Spring Season</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎨</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-semibold rounded">Arts</span>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm">Kids Art Workshop</div>
                  <div className="text-xs text-gray-500 mt-1">Local Museum • Saturdays</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🏕️</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">Camps</span>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm">Summer STEM Camp</div>
                  <div className="text-xs text-gray-500 mt-1">Community Center • June-Aug</div>
                </div>
              </div>
              <div className="text-center mt-6">
                <p className="text-xs text-gray-500 italic">
                  Plus music lessons, story times, festivals, field trips, and more!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
