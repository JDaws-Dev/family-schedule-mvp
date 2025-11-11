"use client";

import Link from "next/link";

interface Event {
  _id: string;
  title: string;
  eventDate: string;
  eventTime?: string;
  location?: string;
  category?: string;
  childName?: string;
}

interface ThisWeekCardProps {
  events: Event[];
  formatTime12Hour: (time: string) => string;
  getCategoryEmoji: (category: string) => string;
  formatMomFriendlyDate: (date: string) => string;
}

export default function ThisWeekCard({
  events,
  formatTime12Hour,
  getCategoryEmoji,
  formatMomFriendlyDate,
}: ThisWeekCardProps) {
  // Sort events by date and time
  const sortedEvents = [...events].sort((a, b) => {
    // First sort by date
    const dateCompare = a.eventDate.localeCompare(b.eventDate);
    if (dateCompare !== 0) return dateCompare;

    // If same date, sort by time (events with time come first, sorted by time)
    if (a.eventTime && b.eventTime) {
      return a.eventTime.localeCompare(b.eventTime);
    }
    if (a.eventTime) return -1; // a has time, b doesn't - a comes first
    if (b.eventTime) return 1;  // b has time, a doesn't - b comes first
    return 0; // neither has time
  });

  // Get upcoming events (max 5 for preview)
  const upcomingPreview = sortedEvents.slice(0, 5);

  if (!events || events.length === 0) {
    return null; // Don't show if no events this week
  }

  return (
    <div className="mb-6">
      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">This Week</h2>
              <p className="text-xs text-gray-500">Coming up next</p>
            </div>
          </div>
          {events.length > 5 && (
            <Link href="/calendar">
              <span className="text-primary-600 text-xs font-semibold hover:underline">
                See all {events.length}
              </span>
            </Link>
          )}
        </div>

        <div className="space-y-2">
          {upcomingPreview.map((event) => (
            <Link key={event._id} href="/calendar">
              <div className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all cursor-pointer">
                {/* Date Badge */}
                <div className="flex-shrink-0 w-12 text-center">
                  <div className="text-xs font-semibold text-gray-500 uppercase">
                    {new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {new Date(event.eventDate + 'T00:00:00').getDate()}
                  </div>
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getCategoryEmoji(event.category || 'Other')}</span>
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{event.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    {event.eventTime && (
                      <span className="font-medium">{formatTime12Hour(event.eventTime)}</span>
                    )}
                    {event.childName && (
                      <>
                        <span>•</span>
                        <span className="truncate">{event.childName}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View Calendar Link */}
        <Link href="/calendar">
          <div className="mt-3 text-center py-2 text-primary-600 font-semibold text-sm hover:text-primary-700 transition-colors">
            View Full Calendar →
          </div>
        </Link>
      </div>
    </div>
  );
}
