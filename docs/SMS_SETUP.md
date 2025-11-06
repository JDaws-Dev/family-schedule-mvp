# SMS Notifications Setup Guide

This guide explains how to set up SMS notifications for Our Daily Family using Twilio.

## Current Status

✅ **Email notifications**: Fully implemented with Resend
⏳ **SMS notifications**: Infrastructure ready, awaiting Twilio setup

## Prerequisites

- Twilio account (sign up at [twilio.com](https://www.twilio.com))
- Phone number from Twilio ($1-2/month)
- Budget for SMS costs (~$0.0075 per SMS in the US)

## Setup Steps

### 1. Create Twilio Account

1. Sign up at https://www.twilio.com/try-twilio
2. Complete phone verification
3. Get your free trial credit ($15)

### 2. Get Twilio Phone Number

1. Go to "Phone Numbers" in Twilio Console
2. Click "Buy a Number"
3. Select a number with SMS capabilities
4. Note down the phone number

### 3. Get API Credentials

1. Go to Twilio Console Dashboard
2. Find your "Account Info" section
3. Copy the following:
   - Account SID
   - Auth Token

### 4. Update Environment Variables

Add the following to your `.env.local`:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

### 5. Install Twilio SDK (if not already installed)

```bash
npm install twilio
```

### 6. Implement SMS Sending

Create `/lib/sms.ts`:

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string) {
  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log('SMS sent:', message.sid);
    return message;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw error;
  }
}

export async function sendEventReminderSMS(data: {
  phoneNumber: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  childName?: string;
}) {
  const timeStr = data.eventTime ? ` at ${data.eventTime}` : '';
  const locationStr = data.eventLocation ? `\nLocation: ${data.eventLocation}` : '';
  const memberStr = data.childName ? ` for ${data.childName}` : '';

  const message = `📅 Reminder${memberStr}: ${data.eventTitle}\nDate: ${data.eventDate}${timeStr}${locationStr}`;

  return await sendSMS(data.phoneNumber, message);
}
```

### 7. Update Convex Notifications

Update `/convex/notifications.ts` to add SMS sending:

```typescript
// Add to sendEventReminders action
if (prefs.smsRemindersEnabled && user.phoneNumber) {
  await fetch('https://api.twilio.com/2010-04-01/Accounts/' + process.env.TWILIO_ACCOUNT_SID + '/Messages.json', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(
        process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN
      ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: user.phoneNumber,
      From: process.env.TWILIO_PHONE_NUMBER,
      Body: `📅 Reminder: ${event.title} on ${event.eventDate}${event.eventTime ? ' at ' + event.eventTime : ''}`,
    }),
  });
}
```

### 8. Enable SMS in Settings UI

The SMS toggle is already in the settings page but disabled. Once Twilio is set up:

1. Remove the `disabled` attribute from the SMS toggle in `/app/settings/page.tsx`
2. Update the text to remove "(coming soon)"

## Cost Estimates

### Free Trial
- $15 free credit (good for ~2,000 SMS messages)
- Perfect for testing

### Production Costs
- Phone number: ~$1-2/month
- SMS (US): ~$0.0075 per message
- SMS (International): varies by country ($0.01-0.30 per message)

**Example monthly costs:**
- 100 users × 10 events/month × 2 reminders = 2,000 SMS = ~$15/month + $1 phone = $16/month
- 500 users would be ~$75/month

## Testing

1. Enable SMS in your user settings
2. Add your phone number to your account
3. Create a test event 24 hours in the future
4. Wait for the hourly cron job or manually trigger it

## Troubleshooting

### SMS not sending
- Check Twilio console logs
- Verify phone number format (must include country code: +1234567890)
- Check account balance

### Wrong phone number format
- Phone numbers must include country code
- Use E.164 format: +[country][number]
- Example: US number (555) 123-4567 → +15551234567

### Rate limiting
- Twilio has default rate limits
- Contact support to increase if needed

## Security Notes

- Never commit Twilio credentials to git
- Use environment variables for all sensitive data
- Consider using Twilio subaccounts for production vs development
- Enable two-factor authentication on your Twilio account

## Additional Features (Future)

Once SMS is set up, consider adding:
- SMS replies for RSVP (yes/no responses)
- SMS commands (e.g., "NEXT" to see next event)
- Delivery status webhooks
- Opt-out keyword handling (required for compliance)

## Compliance

If sending promotional SMS:
- Obtain explicit consent
- Include opt-out instructions in every message
- Keep records of consent
- Honor opt-out requests within 5 minutes
- Register for A2P 10DLC (required for high-volume SMS in US)

For transactional SMS (reminders):
- Still need user consent
- Opt-out still required
- Generally lower compliance burden
