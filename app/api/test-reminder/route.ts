import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Resend } from "resend";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { userId, userEmail } = await request.json();

    if (!userId || !userEmail) {
      return NextResponse.json({ error: "Missing userId or userEmail" }, { status: 400 });
    }

    // Get Clerk JWT token for authenticated Convex queries
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

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

    // Send test email with Resend
    console.log(`Sending test reminder to ${userEmail}`);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: userEmail,
      subject: "Test Reminder - Our Daily Family",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .settings { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
              .settings li { margin: 10px 0; }
              .success { color: #10b981; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Test Reminder</h1>
              </div>
              <div class="content">
                <p><strong class="success">Success!</strong> This is a test reminder from Our Daily Family.</p>
                <p>Your reminders are working correctly. You'll receive notifications like this based on your preferences:</p>
                <div class="settings">
                  <h3>Your Current Settings:</h3>
                  <ul>
                    <li><strong>Email reminder timing:</strong> ${prefs.emailReminderHoursBefore || 24} hours before events</li>
                    <li><strong>SMS reminder timing:</strong> ${prefs.smsReminderHoursBefore || 1} hours before events</li>
                    <li><strong>Email reminders:</strong> ${prefs.emailRemindersEnabled ? '✅ Enabled' : '❌ Disabled'}</li>
                    <li><strong>SMS reminders:</strong> ${prefs.smsRemindersEnabled ? '✅ Enabled' : '❌ Disabled'}</li>
                  </ul>
                </div>
                <p style="margin-top: 20px;">You'll receive reminders for upcoming events based on these settings.</p>
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  Questions? Just reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #667eea;">settings page</a>.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("Email sent successfully:", data);

    return NextResponse.json({
      success: true,
      message: "Test reminder sent successfully",
      details: {
        email: userEmail,
        emailReminderHoursBefore: prefs.emailReminderHoursBefore || 24,
        smsReminderHoursBefore: prefs.smsReminderHoursBefore || 1,
        emailRemindersEnabled: prefs.emailRemindersEnabled,
        smsRemindersEnabled: prefs.smsRemindersEnabled,
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
