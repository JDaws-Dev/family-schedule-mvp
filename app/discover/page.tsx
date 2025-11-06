"use client";

import Link from "next/link";
import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DiscoverPage() {
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filter, setFilter] = useState("all");
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

  // Get suggested activities from database
  const dbActivities = useQuery(
    api.suggestedActivities.getSuggestedActivitiesByFamily,
    convexUser?.familyId ? { familyId: convexUser.familyId, status: "suggested" } : "skip"
  );

  // Mutations for activity actions
  const quickAddToCalendar = useMutation(api.suggestedActivities.quickAddToCalendar);
  const dismissActivity = useMutation(api.suggestedActivities.dismissActivity);

  // Action to trigger discovery
  const discoverActivities = useAction(api.discover.discoverActivitiesForFamily);

  const handleDiscoverActivities = async () => {
    if (!convexUser?.familyId) return;

    if (!location.trim()) {
      setDiscoveryMessage("❌ Please enter your city or zip code");
      setTimeout(() => setDiscoveryMessage(""), 3000);
      return;
    }

    setIsDiscovering(true);
    setDiscoveryProgress("Step 1 of 3");
    setDiscoveryMessage("🔍 Finding local event sources...");

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setDiscoveryProgress((prev) => {
        if (prev === "Step 1 of 3") {
          setDiscoveryMessage("📄 Reading event calendars and websites...");
          return "Step 2 of 3";
        } else if (prev === "Step 2 of 3") {
          setDiscoveryMessage("✨ Analyzing events for your family...");
          return "Step 3 of 3";
        }
        return prev;
      });
    }, 8000); // Update every 8 seconds

    try {
      console.log("[Discover] Starting discovery for:", location, "within", distance, "miles", "from", startDate, "to", endDate);
      const result = await discoverActivities({
        familyId: convexUser.familyId,
        userLocation: location,
        distance: distance,
        startDate: startDate,
        endDate: endDate,
        apiBaseUrl: window.location.origin, // Pass current site URL to Convex action
      });

      console.log("[Discover] Discovery completed:", result);

      clearInterval(progressInterval);
      setDiscoveryProgress("");
      setDiscoveryMessage(
        `✅ Success! Found ${result.activitiesDiscovered} new recommendations from ${result.eventsScraped} events.`
      );
    } catch (error: any) {
      console.error("[Discover] Error during discovery:", error);
      clearInterval(progressInterval);
      setDiscoveryProgress("");
      setDiscoveryMessage(`❌ Error: ${error.message || "Unknown error occurred"}`);
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
    } catch (error: any) {
      console.error("Error adding to calendar:", error);
      alert("Failed to add to calendar. Please try again.");
    }
  };

  const handleDismiss = async (activityId: any) => {
    await dismissActivity({ activityId });
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

  const categories = ["all", "sports", "arts", "education", "entertainment", "community"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            Our Daily Family
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/calendar" className="text-gray-600 hover:text-gray-900">Calendar</Link>
            <Link href="/review" className="text-gray-600 hover:text-gray-900">Inbox</Link>
            <Link href="/discover" className="text-primary-600 font-medium">Discover</Link>
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
              <Link href="/dashboard" className="px-4 py-3 text-gray-600 hover:bg-gray-50">Dashboard</Link>
              <Link href="/calendar" className="px-4 py-3 text-gray-600 hover:bg-gray-50">Calendar</Link>
              <Link href="/review" className="px-4 py-3 text-gray-600 hover:bg-gray-50">Inbox</Link>
              <Link href="/discover" className="px-4 py-3 text-primary-600 font-medium bg-primary-50">Discover</Link>
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

        {/* Discovery Banner */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Find Activities Near You
                </h2>
                <p className="text-gray-600 text-base leading-relaxed">
                  Enter your location to discover local events, classes, and activities
                  tailored to your family's interests and ages.
                </p>
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
                </div>
              </div>

              <button
                onClick={handleDiscoverActivities}
                disabled={isDiscovering}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                  "Find New Activities"
                )}
              </button>

              {isDiscovering && discoveryProgress && (
                <div className="mt-6 p-5 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900">{discoveryProgress}</span>
                    <span className="text-xs text-gray-500">30-60 seconds</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                      style={{
                        width: discoveryProgress === "Step 1 of 3" ? "33%" :
                               discoveryProgress === "Step 2 of 3" ? "66%" : "100%"
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap border ${
                filter === cat
                  ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
              {cat === "all" && ` (${suggestedActivities.length})`}
            </button>
          ))}
        </div>

        {/* Activity Cards */}
        {suggestedActivities.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {suggestedActivities
              .filter(activity => filter === "all" || activity.category?.toLowerCase() === filter)
              .map((activity) => (
                <div key={activity._id} className="bg-white rounded-xl shadow-soft hover:shadow-medium transition-all border border-gray-200">
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
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
            <div className="text-7xl mb-6 opacity-40">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              No Activities Yet
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
              Enter your location above and click "Find New Activities" to discover local events and activities tailored to your family.
            </p>
            <button
              onClick={handleDiscoverActivities}
              disabled={isDiscovering}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDiscovering ? "Searching..." : "Start Discovering"}
            </button>
          </div>
        )}

        {/* How It Works */}
        <div className="mt-12 bg-white rounded-xl shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            How Discovery Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="font-semibold text-gray-900 mb-2">1. We Search Local Sources</h3>
              <p className="text-gray-600 text-sm">
                We check local websites, community boards, library calendars, and recreation departments to find activities and events in your area.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Personalized Matching</h3>
              <p className="text-gray-600 text-sm">
                Activities are matched to your family based on your kids' ages, location, and interests. Only the best matches are shown to you.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">⭐</div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Save What You Like</h3>
              <p className="text-gray-600 text-sm">
                Click "Add to Calendar" to instantly add activities to your family calendar, or dismiss ones that aren't a good fit. It's completely free to use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
