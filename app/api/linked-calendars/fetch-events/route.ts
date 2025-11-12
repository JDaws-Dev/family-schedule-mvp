import { NextRequest, NextResponse } from "next/server";
import { fetchAndParseIcal } from "@/lib/icalParser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fetch events from a linked calendar (iCal feed)
 * POST /api/linked-calendars/fetch-events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, searchTerm, dateFilter } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: "Calendar URL is required" },
        { status: 400 }
      );
    }

    console.log('[Fetch Events API] Fetching calendar from:', url);

    // Fetch and parse the iCal feed
    let events = await fetchAndParseIcal(url);

    console.log('[Fetch Events API] Fetched', events.length, 'events');

    // Filter by search term if provided
    if (searchTerm && searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      events = events.filter((event) =>
        event.title.toLowerCase().includes(search) ||
        event.description?.toLowerCase().includes(search) ||
        event.location?.toLowerCase().includes(search)
      );
      console.log('[Fetch Events API] Filtered to', events.length, 'events matching:', searchTerm);
    }

    // Filter by date range if provided
    if (dateFilter) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const today = now.toISOString().split('T')[0];

      if (dateFilter === 'upcoming') {
        // Next 30 days
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const endDate = thirtyDaysFromNow.toISOString().split('T')[0];

        events = events.filter((event) =>
          event.startDate >= today && event.startDate <= endDate
        );
      } else if (dateFilter === 'this_week') {
        // Next 7 days
        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const endDate = sevenDaysFromNow.toISOString().split('T')[0];

        events = events.filter((event) =>
          event.startDate >= today && event.startDate <= endDate
        );
      } else if (dateFilter === 'this_month') {
        // Current month
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const endDate = lastDayOfMonth.toISOString().split('T')[0];

        events = events.filter((event) =>
          event.startDate >= startDate && event.startDate <= endDate
        );
      }

      console.log('[Fetch Events API] Filtered to', events.length, 'events for date range:', dateFilter);
    }

    // Sort by date (ascending)
    events.sort((a, b) => {
      if (a.startDate !== b.startDate) {
        return a.startDate.localeCompare(b.startDate);
      }
      // If same date, sort by time
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });

    return NextResponse.json({
      success: true,
      events,
      total: events.length,
    });

  } catch (error: any) {
    console.error('[Fetch Events API] Error:', error);

    return NextResponse.json(
      {
        error: error.message || "Failed to fetch calendar events",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
