# Google OAuth Verification Guide

## Current Status
Your app is currently in **"Testing" mode**, which means:
- Users see a warning: "Google hasn't verified this app"
- Limited to 100 test users
- Requires users to click "Advanced" → "Go to [App Name] (unsafe)"

## Goal
Get your app **"Verified"** so users don't see warnings.

---

## Steps to Get Verified

### 1. Prepare Your Application

**Requirements:**
- ✅ Domain name (you have this: your Vercel domain or custom domain)
- ✅ Privacy Policy page (add this to your site)
- ✅ Terms of Service page (add this to your site)
- ✅ Homepage URL
- ✅ Authorized domains configured

**Action Items:**
1. Create a Privacy Policy page at `/privacy` on your site
2. Create a Terms of Service page at `/terms` on your site
3. Make sure your app has a clear description of what it does
4. Have your logo ready (512x512px PNG)

---

### 2. Complete OAuth Consent Screen

**Go to:** [Google Cloud Console](https://console.cloud.google.com)

**Steps:**
1. Select your project
2. Navigate to: **APIs & Services > OAuth consent screen**
3. Fill out ALL required fields:
   - **App name**: nufamly
   - **User support email**: support@nufamly.com
   - **App logo**: Upload your 512x512px logo
   - **App homepage**: https://your-domain.com
   - **App privacy policy**: https://your-domain.com/privacy
   - **App terms of service**: https://your-domain.com/terms
   - **Authorized domains**: Add your domain(s)
     - vercel.app
     - your-custom-domain.com (if you have one)

4. **Scopes Section**: List exactly what Gmail permissions you need
   - `https://www.googleapis.com/auth/gmail.readonly` - Read emails
   - `https://www.googleapis.com/auth/gmail.metadata` - Email metadata
   - `https://www.googleapis.com/auth/gmail.modify` - Manage push notifications
   - `https://www.googleapis.com/auth/calendar` - Access Google Calendar
   - `https://www.googleapis.com/auth/calendar.events` - Manage calendar events

5. **Test users**: Add email addresses of people who can test (up to 100)

6. Click **"Save and Continue"**

---

### 3. Submit for Verification

**After completing the OAuth consent screen:**

1. Click the **"Publish App"** button
2. You'll be prompted to submit for verification
3. Click **"Prepare for Verification"**

**What Google Wants to See:**

#### A. App Information
- Clear description of what your app does
- Why you need each scope (Gmail + Calendar access)
- YouTube video demo (optional but helps)

#### B. Domain Verification
- Prove you own the domain
- Add a meta tag or DNS record to verify ownership
- [Domain Verification Instructions](https://support.google.com/cloud/answer/9110914)

#### C. Privacy Policy Requirements
Your privacy policy must include:
- What data you collect (emails, calendar events)
- How you use the data (extract events, display calendar)
- How you store the data (Convex database, encrypted)
- How users can delete their data (account deletion)
- How you protect the data (encryption, secure APIs)
- Third-party services you use (OpenAI for event extraction)
- How long you keep the data
- Contact information for privacy concerns

#### D. Justification for Sensitive Scopes
You need to explain why you need Gmail/Calendar access:

**Example Justification:**
```
Our app helps families manage their schedules by:

1. Gmail Scopes (readonly, metadata, modify):
   - We read emails to automatically extract event information (e.g.,
     "Soccer practice on Saturday at 3pm")
   - We use push notifications to detect new emails in real-time
   - This saves busy parents time from manually adding every activity

2. Calendar Scopes (calendar, calendar.events):
   - We sync extracted events to the user's Google Calendar
   - We allow two-way sync so changes in Google Calendar appear in our app
   - We let users import from external calendars (school, sports teams)

Security measures:
- OAuth tokens are encrypted in our database
- We only access emails/calendars when explicitly authorized by the user
- Users can revoke access at any time
- We comply with Google's API Services User Data Policy
```

---

### 4. Verification Review Process

**Timeline:**
- Initial review: 3-6 weeks
- Additional info requests: 1-2 weeks each
- Total: Usually 1-3 months

**What Google Checks:**
- Privacy policy compliance
- Secure handling of user data
- Legitimate use case for scopes
- Domain ownership
- App functionality matches description

**Tips for Approval:**
1. **Be thorough**: Answer every question completely
2. **Record a demo**: Show your app in action (makes review faster)
3. **Be responsive**: Reply quickly to any follow-up questions
4. **Match descriptions**: Make sure your app description matches what the app actually does

---

### 5. Alternatives While Waiting

**Option A: Use as "Internal" App**
- Change OAuth consent screen to "Internal"
- Only available to users in your Google Workspace domain
- No verification needed
- **Limitation**: Only works if you have a Google Workspace organization

**Option B: Stay in Testing Mode**
- Keep adding test users (up to 100)
- Each family can add their email as a test user
- Users still see warning but can proceed
- **Best for**: Beta testing phase

**Option C: Request "Brand Account" Review**
- If you're a known brand/organization
- Faster review process
- Still need privacy policy and terms

---

### 6. After Verification

Once approved:
- ✅ No more warning screens
- ✅ Unlimited users
- ✅ App appears more trustworthy
- ✅ Better conversion rates

**Maintaining Verification:**
- Don't add new scopes without re-verification
- Keep privacy policy updated
- Respond to any security audits
- Monitor your API usage quotas

---

## Quick Checklist

Before submitting:
- [ ] Privacy Policy page live on your domain
- [ ] Terms of Service page live on your domain
- [ ] OAuth consent screen completely filled out
- [ ] All scopes justified with explanations
- [ ] Domain verified in Google Cloud Console
- [ ] Test users can successfully sign in
- [ ] App logo uploaded (512x512px)
- [ ] Demo video recorded (optional but recommended)
- [ ] Support email monitored and responsive

---

## Resources

- [Google OAuth Verification Guide](https://support.google.com/cloud/answer/9110914)
- [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [OAuth Consent Screen Setup](https://support.google.com/cloud/answer/10311615)
- [Privacy Policy Generator](https://www.termsfeed.com/privacy-policy-generator/)

---

## Need Help?

If you get stuck:
1. Check [Google's OAuth FAQ](https://support.google.com/cloud/answer/10311615)
2. Post in [Google Cloud Community](https://www.googlecloudcommunity.com/)
3. Contact Google Cloud Support (if you have a paid plan)

---

**Estimated Timeline**: 1-3 months for full verification
**Recommended**: Start the process now while in beta testing mode
