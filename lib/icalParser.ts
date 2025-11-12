import ICAL from 'ical.js';

export interface ParsedCalendarEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endDate?: string;
  endTime?: string;
  isAllDay: boolean;
}

/**
 * Fetches and parses an iCal feed from a URL
 * @param url - The iCal/webcal URL to fetch
 * @returns Array of parsed calendar events
 */
export async function fetchAndParseIcal(url: string): Promise<ParsedCalendarEvent[]> {
  // Convert webcal:// to https://
  const httpsUrl = url.replace(/^webcal:/, 'https:');

  try {
    console.log('[iCal Parser] Fetching calendar from:', httpsUrl);

    // Fetch the iCal data
    const response = await fetch(httpsUrl, {
      headers: {
        'User-Agent': 'Our Daily Family/1.0',
        'Accept': 'text/calendar, text/plain',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
    }

    const icalData = await response.text();

    if (!icalData || icalData.trim().length === 0) {
      throw new Error('Calendar feed is empty');
    }

    // Check if response looks like iCal data
    if (!icalData.includes('BEGIN:VCALENDAR') && !icalData.includes('BEGIN:vcalendar')) {
      console.error('[iCal Parser] Response does not appear to be iCal format:', icalData.substring(0, 500));
      throw new Error('This doesn\'t look like a calendar file. Make sure you\'re using an iCal/webcal URL.');
    }

    console.log('[iCal Parser] Fetched', icalData.length, 'bytes, parsing...');

    // Parse with ical.js
    let jcalData;
    try {
      jcalData = ICAL.parse(icalData);
    } catch (parseError: any) {
      console.error('[iCal Parser] Parse error details:', parseError);
      throw new Error(`Invalid iCal format: ${parseError.message || 'Unable to parse calendar data'}`);
    }

    if (!jcalData || !Array.isArray(jcalData)) {
      throw new Error('Parsed calendar data is invalid');
    }

    let comp;
    try {
      comp = new ICAL.Component(jcalData);
    } catch (compError: any) {
      console.error('[iCal Parser] Component creation error:', compError);
      throw new Error(`Invalid calendar structure: ${compError.message || 'Unable to read calendar'}`);
    }

    let vevents;
    try {
      vevents = comp.getAllSubcomponents('vevent');
    } catch (eventError: any) {
      console.error('[iCal Parser] Error getting events:', eventError);
      throw new Error('Unable to read events from calendar');
    }

    console.log('[iCal Parser] Found', vevents.length, 'events');

    const events: ParsedCalendarEvent[] = [];

    for (const vevent of vevents) {
      try {
        const event = new ICAL.Event(vevent);

        // Extract basic info
        const uid = event.uid;
        const title = event.summary || 'Untitled Event';
        const description = event.description || undefined;
        const location = event.location || undefined;

        // Handle dates/times
        const startDate = event.startDate;

        if (!startDate) {
          console.warn('[iCal Parser] Skipping event without start date:', title);
          continue;
        }

        // Check if this is an all-day event
        const isAllDay = startDate.isDate; // ical.js sets isDate=true for date-only events

        // Format start date
        const startJS = startDate.toJSDate();
        const startDateStr = formatDateToISO(startJS);

        let startTimeStr: string | undefined;
        let endDateStr: string | undefined;
        let endTimeStr: string | undefined;

        if (!isAllDay) {
          // Timed event - extract time
          startTimeStr = formatTime(startJS);

          // Get end time if available
          const endDate = event.endDate;
          if (endDate) {
            const endJS = endDate.toJSDate();
            endDateStr = formatDateToISO(endJS);
            endTimeStr = formatTime(endJS);
          }
        }

        events.push({
          uid,
          title,
          description,
          location,
          startDate: startDateStr,
          startTime: startTimeStr,
          endDate: endDateStr,
          endTime: endTimeStr,
          isAllDay,
        });

      } catch (eventError: any) {
        console.error('[iCal Parser] Error parsing event:', eventError);
        // Continue parsing other events
        continue;
      }
    }

    return events;

  } catch (error: any) {
    console.error('[iCal Parser] Error:', error);
    throw new Error(`Failed to parse calendar: ${error.message}`);
  }
}

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object to HH:MM (24-hour format)
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Validate that a URL is a valid iCal/webcal URL
 */
export function isValidCalendarUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // Must be http, https, or webcal protocol
  if (!url.match(/^(https?|webcal):\/\//i)) return false;

  // Try to parse as URL
  try {
    new URL(url.replace(/^webcal:/, 'https:'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches an iCal feed and extracts the calendar name
 * @param url - The iCal/webcal URL to fetch
 * @returns The calendar name (X-WR-CALNAME) or null if not found
 */
export async function fetchCalendarName(url: string): Promise<string | null> {
  // Convert webcal:// to https://
  const httpsUrl = url.replace(/^webcal:/, 'https:');

  try {
    console.log('[iCal Parser] Fetching calendar name from:', httpsUrl);

    // Fetch the iCal data
    const response = await fetch(httpsUrl, {
      headers: {
        'User-Agent': 'Our Daily Family/1.0',
        'Accept': 'text/calendar, text/plain',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
    }

    const icalData = await response.text();

    if (!icalData || icalData.trim().length === 0) {
      return null;
    }

    // Check if response looks like iCal data
    if (!icalData.includes('BEGIN:VCALENDAR') && !icalData.includes('BEGIN:vcalendar')) {
      return null;
    }

    // Parse with ical.js
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);

    // Try to get X-WR-CALNAME property
    const calName = comp.getFirstPropertyValue('x-wr-calname');

    if (calName && typeof calName === 'string') {
      console.log('[iCal Parser] Found calendar name:', calName);
      return calName;
    }

    // Fallback to NAME property if X-WR-CALNAME is not available
    const name = comp.getFirstPropertyValue('name');
    if (name && typeof name === 'string') {
      console.log('[iCal Parser] Found NAME property:', name);
      return name;
    }

    console.log('[iCal Parser] No calendar name found in feed');
    return null;

  } catch (error: any) {
    console.error('[iCal Parser] Error fetching calendar name:', error);
    return null;
  }
}
