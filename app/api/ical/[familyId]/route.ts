import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { createEvents, EventAttributes } from "ics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const { familyId } = await params;

    // Initialize Convex client inside the handler to avoid build-time errors
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Get all confirmed events for the family
    const events = await convex.query(api.events.getEventsByFamily, {
      familyId: familyId as any,
    });

    const confirmedEvents = events.filter((event: any) => event.isConfirmed);

    // Convert to iCal format
    const icalEvents: EventAttributes[] = confirmedEvents.map((event: any) => {
      const [year, month, day] = event.eventDate.split("-").map(Number);

      let startHour = 0;
      let startMinute = 0;

      if (event.eventTime) {
        const [time, meridian] = event.eventTime.split(" ");
        const [h, m] = time.split(":").map(Number);

        if (meridian?.toLowerCase() === "pm" && h !== 12) {
          startHour = h + 12;
        } else if (meridian?.toLowerCase() === "am" && h === 12) {
          startHour = 0;
        } else {
          startHour = h;
        }

        startMinute = m || 0;
      }

      const icalEvent: any = {
        start: [year, month, day, startHour, startMinute],
        title: event.title,
        description: event.description || "",
        location: event.location || "",
        status: "CONFIRMED",
        busyStatus: "BUSY",
        uid: `event-${event._id}@ourdailyfamily.com`,
      };

      // Add end time if available
      if (event.endTime) {
        const [endTime, endMeridian] = event.endTime.split(" ");
        const [endH, endM] = endTime.split(":").map(Number);

        let endHour = endH;
        if (endMeridian?.toLowerCase() === "pm" && endH !== 12) {
          endHour = endH + 12;
        } else if (endMeridian?.toLowerCase() === "am" && endH === 12) {
          endHour = 0;
        }

        icalEvent.end = [year, month, day, endHour, endM || 0];
      } else {
        // Default 1 hour duration
        icalEvent.duration = { hours: 1 };
      }

      // Add child name to title or description
      if (event.childName) {
        icalEvent.title = `${event.title} - ${event.childName}`;
      }

      return icalEvent;
    });

    // Generate iCal file
    const { error, value } = createEvents(icalEvents);

    if (error) {
      console.error("iCal generation error:", error);
      return NextResponse.json({ error: "Failed to generate iCal feed" }, { status: 500 });
    }

    // Return iCal file
    return new NextResponse(value, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="family-calendar.ics"',
      },
    });
  } catch (error: any) {
    console.error("iCal feed error:", error);
    return NextResponse.json(
      { error: "Failed to generate iCal feed", details: error.message },
      { status: 500 }
    );
  }
}
