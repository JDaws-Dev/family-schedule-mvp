"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "../components/Toast";
import BottomNav from "../components/BottomNav";

export default function DiscoverPage() {
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "event" | "place">("all"); // NEW: filter by type
  const [searchKeyword, setSearchKeyword] = useState("");
  const [discoveryKeyword, setDiscoveryKeyword] = useState(""); // Keyword for AI discovery
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false); // For mobile collapsible filters
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
        .filter(Boolean) as string[]
    )
  ).sort();

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
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
            <Link href="/review" className="text-gray-600 hover:text-gray-900">Events</Link>
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
              <Link href="/review" className="px-4 py-3 text-gray-600 hover:bg-gray-50">Events</Link>
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
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🔍</span>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Find Activities
              </h1>
              <p className="text-gray-600 text-lg mt-1">
                Discover new adventures and experiences for your family
              </p>
            </div>
          </div>
          <p className="text-gray-600 max-w-3xl">
            We'll search local parks, libraries, museums, and event sites to find activities your kids will love.
            Perfect for discovering summer camps, sports leagues, art classes, story times, and more - all in one place!
          </p>
        </div>

        {/* Discovery Form */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="space-y-6">
            {/* Simple Location Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter city or ZIP code"
                className="w-full px-4 py-4 text-lg rounded-lg border-2 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
              />
            </div>

            {/* Advanced Options - Collapsible */}
            <div className="border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <span>Advanced Options</span>
                <svg
                  className={`w-5 h-5 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {filtersExpanded && (
                <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Radius
                      </label>
                      <select
                        value={distance}
                        onChange={(e) => setDistance(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Looking for something specific?
                      </label>
                      <input
                        type="text"
                        value={discoveryKeyword}
                        onChange={(e) => setDiscoveryKeyword(e.target.value)}
                        placeholder="e.g., Christmas lights, soccer..."
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Find Activities Button */}
            <button
              onClick={handleDiscoverActivities}
              disabled={isDiscovering || !location}
              className="w-full px-6 py-4 text-lg bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDiscovering ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : (
                "Find Activities"
              )}
            </button>

            {discoveryMessage && (
              <div className={`mt-4 p-4 rounded-lg border ${
                discoveryMessage.includes('Success')
                  ? 'bg-green-50 border-green-200'
                  : discoveryMessage.includes('Error')
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm ${
                  discoveryMessage.includes('Success')
                    ? 'text-green-800'
                    : discoveryMessage.includes('Error')
                    ? 'text-red-800'
                    : 'text-blue-800'
                }`}>{discoveryMessage.replace(/🔍|✅|❌|💡/g, '').trim()}</p>
              </div>
            )}
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

          {/* Type Filter */}
          <div className="sm:w-56">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | "event" | "place")}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white font-medium"
            >
              <option value="all">🎯 All Types</option>
              <option value="event">📅 Events Only</option>
              <option value="place">📍 Places Only</option>
            </select>
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
              // Filter by type (event vs place)
              const matchesType = typeFilter === "all" || activity.type === typeFilter;

              // Filter by category
              const matchesCategory = filter === "all" || activity.category?.toLowerCase() === filter;

              // Filter by search keyword
              const matchesSearch = !searchKeyword ||
                activity.title?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                activity.description?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                activity.category?.toLowerCase().includes(searchKeyword.toLowerCase());

              return matchesType && matchesCategory && matchesSearch;
            });

            // Show empty state if filter returns no results
            if (filteredActivities.length === 0) {
              return (
                <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center">
                  <div className="text-7xl mb-6">🤷‍♀️</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    No activities found
                    {searchKeyword && ` for "${searchKeyword}"`}
                    {filter !== "all" && ` in ${filter}`}
                  </h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Try removing some filters to see more activities.
                  </p>
                  <div className="flex gap-4 justify-center flex-wrap">
                    {searchKeyword && (
                      <button
                        onClick={() => setSearchKeyword("")}
                        className="px-8 py-4 bg-gray-600 text-white rounded-xl text-lg font-bold hover:bg-gray-700 transition-all shadow-md"
                      >
                        Clear Search
                      </button>
                    )}
                    {filter !== "all" && (
                      <button
                        onClick={() => setFilter("all")}
                        className="px-8 py-4 bg-green-600 text-white rounded-xl text-lg font-bold hover:bg-green-700 transition-all shadow-md"
                      >
                        Show All Categories
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredActivities.map((activity) => (
                <div key={activity._id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border-2 border-gray-100">
                  <div className="p-6">
                    {/* Header with Type and Category Badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {/* Type Badge - Event or Place */}
                      <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                        activity.type === 'place'
                          ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                          : 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      }`}>
                        {activity.type === 'place' ? '📍 Place to Visit' : '📅 Scheduled Event'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(activity.category)}`}>
                        {activity.category}
                      </span>
                      {activity.ageRange && (
                        <span className="text-sm text-gray-600 font-medium">
                          {activity.ageRange}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {activity.title}
                    </h3>

                    {/* Conditional Display: Events show date/time, Places show hours */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                      {activity.type === 'place' ? (
                        /* Place Information: Hours, Admission, Amenities */
                        <>
                          {activity.hoursOfOperation && (
                            <div className="flex items-center gap-2 text-base font-medium text-gray-900">
                              <span className="text-xl">🕒</span>
                              <div>
                                <span className="font-semibold text-gray-700">Hours: </span>
                                {activity.hoursOfOperation}
                              </div>
                            </div>
                          )}
                          {activity.admission && (
                            <div className="flex items-center gap-2 text-base text-gray-700">
                              <span className="text-xl">🎫</span>
                              <div>
                                <span className="font-semibold">Admission: </span>
                                {activity.admission}
                              </div>
                            </div>
                          )}
                          {activity.amenities && activity.amenities.length > 0 && (
                            <div className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-xl">✨</span>
                              <div>
                                <span className="font-semibold">Features: </span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {activity.amenities.map((amenity, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-medium">
                                      {amenity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Event Information: Date, Time, Location */
                        <>
                          {(activity.date || activity.time) && (
                        <div className="flex items-center gap-2 text-base font-medium text-gray-900">
                          <span className="text-xl">📅</span>
                          <div>
                            {activity.date && (
                              <span>
                                {new Date(activity.date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  year: new Date(activity.date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                })}
                              </span>
                            )}
                            {activity.time && (
                              <span className="ml-2">
                                at {(() => {
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
                        </div>
                      )}
                        </>
                      )}

                      {/* Location - shown for both events and places */}
                      {activity.location && (
                        <div className="flex items-start gap-2 text-base text-gray-700">
                          <span className="text-xl">📍</span>
                          <span className="font-medium">{activity.location}</span>
                          {activity.distance && (
                            <span className="text-gray-500 text-sm">({activity.distance} mi away)</span>
                          )}
                        </div>
                      )}

                      {/* Price Range - shown for both if applicable */}
                      {activity.priceRange && !activity.admission && (
                        <div className="flex items-center gap-2">
                          <span className="text-xl">💰</span>
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                            {getPriceLabel(activity.priceRange)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {activity.description && (
                      <p className="text-gray-700 mb-4 leading-relaxed">
                        {activity.description}
                      </p>
                    )}

                    {/* Why We Recommend This */}
                    {activity.aiSummary && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">💡</span>
                          <div>
                            <div className="text-xs font-bold text-blue-900 mb-1 uppercase tracking-wide">
                              Why This is Perfect for Your Family
                            </div>
                            <p className="text-sm text-gray-800 leading-relaxed">
                              {activity.aiSummary}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Contact Info - Simplified */}
                    <div className="flex flex-wrap gap-3 mb-5 text-sm">
                      {activity.website && (
                        <a
                          href={activity.website.startsWith('http') ? activity.website : `https://${activity.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium hover:underline"
                        >
                          🌐 View Website
                        </a>
                      )}
                      {activity.phoneNumber && (
                        <a href={`tel:${activity.phoneNumber}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium hover:underline">
                          📞 {activity.phoneNumber}
                        </a>
                      )}
                    </div>

                    {/* Action Buttons - BIGGER and CLEARER */}
                    <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
                      <button
                        onClick={() => handleAddToCalendar(activity._id)}
                        className="flex-1 px-6 py-4 bg-green-600 text-white rounded-xl text-lg font-bold hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span className="text-2xl">📅</span>
                        Add to Calendar
                      </button>
                      <button
                        onClick={() => handleDismiss(activity._id)}
                        className="px-5 py-4 bg-gray-200 text-gray-700 rounded-xl text-base font-semibold hover:bg-gray-300 transition-all"
                      >
                        Not Interested
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
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
            <div className="p-12 text-center">
              <div className="text-8xl mb-6">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Find Fun Activities Near You!
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                Enter your city or ZIP code above and we'll find local activities, events, and classes perfect for your family.
              </p>

              {/* What We Find - Simplified Icons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-8">
                <div className="text-center">
                  <div className="text-5xl mb-2">⚽</div>
                  <div className="font-semibold text-gray-900">Sports & Leagues</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl mb-2">🎨</div>
                  <div className="font-semibold text-gray-900">Arts & Crafts</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl mb-2">🏕️</div>
                  <div className="font-semibold text-gray-900">Summer Camps</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl mb-2">🎭</div>
                  <div className="font-semibold text-gray-900">Classes & Lessons</div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 max-w-2xl mx-auto">
                <p className="text-base text-gray-800 font-medium">
                  We search local parks, libraries, museums, community centers, and event sites to find the best activities for your family!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
}
