import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EventReminderData {
  userEmail: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  childName?: string;
  reminderHoursBefore: number;
}

export interface RSVPAlertData {
  userEmail: string;
  eventTitle: string;
  eventDate: string;
  actionDeadline: string;
  childName?: string;
}

export async function sendEventReminderEmail(data: EventReminderData) {
  const eventTimeStr = data.eventTime ? ` at ${data.eventTime}` : "";
  const locationStr = data.eventLocation ? ` at ${data.eventLocation}` : "";
  const memberStr = data.childName ? ` for ${data.childName}` : "";

  const { data: result, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: data.userEmail,
    subject: `Reminder: ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .event-details { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #667eea; }
            .detail-item { margin: 10px 0; }
            .label { font-weight: bold; color: #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Event Reminder</h1>
            </div>
            <div class="content">
              <p>Hi! This is a reminder about an upcoming event${memberStr}.</p>
              <div class="event-details">
                <h2 style="margin-top: 0; color: #667eea;">${data.eventTitle}</h2>
                <div class="detail-item">
                  <span class="label">📆 Date:</span> ${data.eventDate}${eventTimeStr}
                </div>
                ${data.eventLocation ? `<div class="detail-item"><span class="label">📍 Location:</span> ${data.eventLocation}</div>` : ''}
                ${data.childName ? `<div class="detail-item"><span class="label">👤 For:</span> ${data.childName}</div>` : ''}
                <div class="detail-item" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                  <span class="label">⏰ Reminder:</span> ${data.reminderHoursBefore} hours before the event
                </div>
              </div>
              <p style="margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/calendar" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Calendar</a>
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Don't want these reminders? <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #667eea;">Update your notification settings</a>.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Failed to send event reminder email:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return result;
}

export async function sendRSVPAlertEmail(data: RSVPAlertData) {
  const memberStr = data.childName ? ` for ${data.childName}` : "";

  const { data: result, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: data.userEmail,
    subject: `⚠️ Action Required: RSVP for ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .deadline { font-size: 24px; font-weight: bold; color: #dc2626; text-align: center; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ RSVP Deadline Approaching</h1>
            </div>
            <div class="content">
              <p><strong>Action required${memberStr}!</strong></p>
              <div class="alert-box">
                <h2 style="margin-top: 0; color: #dc2626;">${data.eventTitle}</h2>
                <p><strong>Event Date:</strong> ${data.eventDate}</p>
                <p><strong>RSVP Deadline:</strong></p>
                <div class="deadline">${data.actionDeadline}</div>
                <p style="margin-bottom: 0;">Don't forget to respond before the deadline!</p>
              </div>
              <p style="margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/calendar" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Event Details</a>
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions? Visit your <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #dc2626;">settings page</a>.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Failed to send RSVP alert email:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return result;
}
