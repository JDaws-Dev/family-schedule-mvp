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
  const [location, setLocation] = useState("");
  const [distance, setDistance] = useState(15); // Default 15 miles

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
  const markAsInterested = useMutation(api.suggestedActivities.markAsInterested);
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
    setDiscoveryMessage("🔍 Searching local websites for activities... This may take a minute.");

    try {
      const result = await discoverActivities({
        familyId: convexUser.familyId,
        userLocation: location,
        distance: distance,
        apiBaseUrl: window.location.origin, // Pass current site URL to Convex action
      });

      setDiscoveryMessage(
        `✅ Success! Found ${result.activitiesDiscovered} new recommendations from ${result.eventsScraped} events.`
      );
    } catch (error: any) {
      setDiscoveryMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsDiscovering(false);
      setTimeout(() => setDiscoveryMessage(""), 8000);
    }
  };

  const handleMarkInterested = async (activityId: any) => {
    await markAsInterested({ activityId });
  };

  const handleDismiss = async (activityId: any) => {
    await dismissActivity({ activityId });
  };

  // Use database activities or empty array
  const suggestedActivities = dbActivities || [];

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
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            Our Daily Family
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/events" className="text-gray-600 hover:text-gray-900">Events</Link>
            <Link href="/inbox" className="text-gray-600 hover:text-gray-900">Inbox</Link>
            <Link href="/discover" className="text-indigo-600 font-medium">Discover</Link>
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
              <Link href="/events" className="px-4 py-3 text-gray-600 hover:bg-gray-50">Events</Link>
              <Link href="/inbox" className="px-4 py-3 text-gray-600 hover:bg-gray-50">Inbox</Link>
              <Link href="/discover" className="px-4 py-3 text-indigo-600 font-medium bg-indigo-50">Discover</Link>
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
        <div className="bg-indigo-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">
                  🎯 Personalized for Your Family
                </h2>
                <p className="mb-4 opacity-90">
                  We search local websites, community calendars, and event listings to find
                  activities perfect for your family. All recommendations are matched to
                  your kids' ages and interests.
                </p>
              </div>
              <div className="text-6xl ml-4 hidden sm:block">🎯</div>
            </div>

            {/* Location and Distance Controls */}
            <div className="bg-white/10 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Suwanee, GA or 30519"
                    className="w-full px-4 py-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Search Radius
                  </label>
                  <select
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-white"
                  >
                    <option value={5}>5 miles</option>
                    <option value={10}>10 miles</option>
                    <option value={15}>15 miles</option>
                    <option value={20}>20 miles</option>
                    <option value={25}>25 miles</option>
                    <option value={30}>30 miles</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleDiscoverActivities}
                disabled={isDiscovering}
                className="w-full px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDiscovering ? "🔄 Searching..." : "🔍 Find New Activities"}
              </button>

              {discoveryMessage && (
                <div className="mt-4 p-3 bg-white/20 rounded-lg">
                  <p className="text-sm">{discoveryMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                filter === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
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
                <div key={activity._id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow border border-gray-200">
                  <div className="p-6">
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
                          <span className="text-green-600 font-medium">
                            {getPriceLabel(activity.priceRange)}
                          </span>
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
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">💡</span>
                          <div>
                            <div className="text-xs font-semibold text-blue-800 mb-1">
                              Why We Recommend This
                            </div>
                            <p className="text-sm text-blue-900">
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkInterested(activity._id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                      >
                        ⭐ Interested
                      </button>
                      <button
                        onClick={() => handleDismiss(activity._id)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
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
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No activities discovered yet
            </h2>
            <p className="text-gray-600 mb-6">
              Click "Find New Activities" above to start discovering local events and activities personalized for your family.
            </p>
            <button
              onClick={handleDiscoverActivities}
              disabled={isDiscovering}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
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
              <h3 className="font-semibold text-gray-900 mb-2">1. We Search Daily</h3>
              <p className="text-gray-600 text-sm">
                We automatically check local websites, community boards, library calendars, and recreation departments to find new activities and events.
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
                Mark activities as "Interested" to save them for later, or dismiss ones that aren't a good fit. It's completely free to use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
