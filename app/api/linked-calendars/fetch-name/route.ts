import { NextRequest, NextResponse } from 'next/server';
import { fetchCalendarName } from '@/lib/icalParser';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    const calendarName = await fetchCalendarName(url);

    return NextResponse.json({
      success: true,
      calendarName,
    });

  } catch (error: any) {
    console.error('[Fetch Calendar Name API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch calendar name' },
      { status: 500 }
    );
  }
}
