import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Missing phoneNumber" }, { status: 400 });
    }

    console.log(`Sending test SMS to ${phoneNumber}`);

    // Send SMS via Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: process.env.TWILIO_PHONE_NUMBER!,
          Body: "Test SMS from Our Daily Family! Your SMS notifications are working correctly. 📱",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Twilio API error:", error);
      throw new Error(`Failed to send SMS: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log("SMS sent successfully:", result);

    return NextResponse.json({
      success: true,
      message: "Test SMS sent successfully",
      details: {
        phoneNumber,
        messageSid: result.sid,
      },
    });
  } catch (error: any) {
    console.error("Error sending test SMS:", error);
    return NextResponse.json(
      {
        error: "Failed to send test SMS",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
