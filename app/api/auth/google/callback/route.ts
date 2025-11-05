import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  console.log("OAuth callback - code:", code ? "present" : "missing");
  console.log("OAuth callback - state:", stateParam);

  if (!code || !stateParam) {
    console.error("Missing code or state parameter");
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_params`);
  }

  // Parse state to extract userId and returnUrl
  let userId: string;
  let returnUrl = "/settings";

  try {
    const stateObj = JSON.parse(stateParam);
    userId = stateObj.userId;
    returnUrl = stateObj.returnUrl || "/settings";
  } catch (e) {
    // Fallback for old format (just userId string)
    userId = stateParam;
  }

  if (!userId) {
    console.error("Missing userId in state");
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_user`);
  }

  try {
    console.log("Exchanging code for tokens...");
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();
    console.log("Token response:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      error: tokens.error
    });

    if (!tokens.access_token) {
      throw new Error(`Failed to obtain access token: ${JSON.stringify(tokens)}`);
    }

    if (!tokens.refresh_token) {
      console.warn("No refresh token received - user may need to revoke access and reconnect");
    }

    // Get user's Gmail email
    console.log("Fetching user info...");
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoResponse.json();
    console.log("User info:", { email: userInfo.email, name: userInfo.name });

    // Store tokens in Convex
    console.log("Storing in Convex...");
    const result = await convex.mutation(api.gmailAccounts.connectGmailAccount, {
      clerkId: userId,
      gmailEmail: userInfo.email,
      displayName: userInfo.name || userInfo.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || "",
    });

    console.log("Convex mutation result:", result);

    // Redirect to the appropriate page with success flag
    const redirectUrl = new URL(returnUrl, process.env.NEXT_PUBLIC_APP_URL!);
    redirectUrl.searchParams.set("success", "gmail_connected");

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("OAuth callback error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // Redirect back to the returnUrl with error
    const redirectUrl = new URL(returnUrl, process.env.NEXT_PUBLIC_APP_URL!);
    redirectUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(redirectUrl.toString());
  }
}
