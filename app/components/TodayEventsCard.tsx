"use client";

import SwipeableCard from "./SwipeableCard";

interface Event {
  _id: string;
  title: string;
  eventDate: string;
  eventTime?: string;
  endTime?: string;
  location?: string;
  category?: string;
  childName?: string;
  description?: string;
  requiresAction?: boolean;
  actionCompleted?: boolean;
  actionDescription?: string;
  actionDeadline?: string;
  isConfirmed?: boolean;
  createdByUserId?: string;
}

interface TodayEventsCardProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onSwipeLeft: (event: Event) => void;
  onSwipeRight: (event: Event) => void;
  familyMembers?: any[];
  formatTime12Hour: (time: string) => string;
  getCategoryColor: (category: string) => string;
  getCategoryEmoji: (category: string) => string;
}

export default function TodayEventsCard({
  events,
  onEventClick,
  onSwipeLeft,
  onSwipeRight,
  familyMembers,
  formatTime12Hour,
  getCategoryColor,
  getCategoryEmoji,
}: TodayEventsCardProps) {
  if (!events || events.length === 0) {
    return (
      <div className="mb-6">
        <div className="bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">TODAY</h2>
              <p className="text-xs text-primary-50">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-white/90 text-sm font-medium">Nothing scheduled today</p>
            <p className="text-white/70 text-xs mt-1">Enjoy your free time!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">TODAY</h2>
              <p className="text-xs text-primary-50">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-white font-bold text-sm">{events.length}</span>
          </div>
        </div>

        <div className="space-y-3">
          {events.map((event, index) => (
            <SwipeableCard
              key={event._id}
              onSwipeLeft={() => onSwipeLeft(event)}
              onSwipeRight={() => onSwipeRight(event)}
              rightAction={event.requiresAction && !event.actionCompleted ? {
                label: "Complete",
                icon: <span>✓</span>,
                color: "#10b981"
              } : undefined}
            >
              <div
                onClick={() => onEventClick(event)}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                {/* Action Required Badges */}
                {!event.isConfirmed && (
                  <div className="mb-2 px-2 py-1 bg-amber-50 border-l-2 border-amber-500 rounded text-xs font-semibold text-amber-900 inline-block">
                    Needs Review
                  </div>
                )}
                {event.requiresAction && !event.actionCompleted && (
                  <div className="mb-2 px-2 py-1 bg-red-50 border-l-2 border-red-500 rounded text-xs font-semibold text-red-900 inline-block">
                    Action Required
                  </div>
                )}

                <div className="flex gap-3">
                  {/* Category Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{
                        backgroundColor: event.category ? `${getCategoryColor(event.category)}15` : '#f3f4f615',
                        borderLeft: `3px solid ${getCategoryColor(event.category || 'Other')}`,
                      }}
                    >
                      {getCategoryEmoji(event.category || 'Other')}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base mb-2 leading-tight">{event.title}</h3>

                    {/* Time and Location */}
                    <div className="space-y-1 mb-2">
                      {event.eventTime && (
                        <div className="flex items-center gap-1.5 text-gray-700 text-sm">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold">{formatTime12Hour(event.eventTime)}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Child Names */}
                    {event.childName && (
                      <div className="flex flex-wrap gap-1.5">
                        {(() => {
                          const names = event.childName.split(",").map((n: string) => n.trim());
                          return names.map((name: string, idx: number) => {
                            const member = familyMembers?.find((m: any) => m.name === name);
                            const color = member?.color || "#6366f1";
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {name}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SwipeableCard>
          ))}
        </div>
      </div>
    </div>
  );
}
