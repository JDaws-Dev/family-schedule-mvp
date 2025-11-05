import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail } = await request.json();

    if (!userId || !userEmail) {
      return NextResponse.json({ error: "Missing userId or userEmail" }, { status: 400 });
    }

    // Get user preferences to check if email reminders are enabled
    const prefs = await convex.query(api.notifications.getUserPreferences, {
      userId: userId as Id<"users">,
    });

    if (!prefs.emailRemindersEnabled) {
      return NextResponse.json(
        { error: "Email reminders are disabled in your preferences" },
        { status: 400 }
      );
    }

    // Send test email (for now, just log it)
    console.log(`Sending test reminder to ${userEmail}`);

    // In production, you would integrate with an email service like Resend:
    // await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     from: "Our Daily Family <reminders@ourdailyfamily.com>",
    //     to: userEmail,
    //     subject: "Test Reminder - Our Daily Family",
    //     html: `
    //       <h1>Test Reminder</h1>
    //       <p>This is a test reminder from Our Daily Family!</p>
    //       <p>Your reminders are working correctly. You'll receive notifications like this based on your preferences:</p>
    //       <ul>
    //         <li>Reminder timing: ${prefs.reminderHoursBefore} hours before events</li>
    //         <li>Email reminders: ${prefs.emailRemindersEnabled ? 'Enabled' : 'Disabled'}</li>
    //       </ul>
    //     `,
    //   }),
    // });

    return NextResponse.json({
      success: true,
      message: "Test reminder sent successfully",
      details: {
        email: userEmail,
        reminderHoursBefore: prefs.reminderHoursBefore,
        emailRemindersEnabled: prefs.emailRemindersEnabled,
      },
    });
  } catch (error: any) {
    console.error("Error sending test reminder:", error);

    return NextResponse.json(
      {
        error: "Failed to send test reminder",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
