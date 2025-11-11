import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  // Use request origin as fallback for APP_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  console.log("OAuth callback - code:", code ? "present" : "missing");
  console.log("OAuth callback - state:", stateParam);
  console.log("OAuth callback - appUrl:", appUrl);

  if (!code || !stateParam) {
    console.error("Missing code or state parameter");
    return NextResponse.redirect(`${appUrl}/settings?error=missing_params`);
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
    return NextResponse.redirect(`${appUrl}/settings?error=missing_user`);
  }

  try {
    console.log("[oauth-callback] Exchanging code for tokens...");
    console.log("[oauth-callback] Has code:", !!code);
    console.log("[oauth-callback] Has client ID:", !!process.env.GOOGLE_CLIENT_ID);
    console.log("[oauth-callback] Client ID length:", process.env.GOOGLE_CLIENT_ID?.length || 0);
    console.log("[oauth-callback] Has client secret:", !!process.env.GOOGLE_CLIENT_SECRET);
    console.log("[oauth-callback] Client secret length:", process.env.GOOGLE_CLIENT_SECRET?.length || 0);
    console.log("[oauth-callback] Redirect URI:", `${appUrl}/api/auth/google/callback`);

    const requestBody = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      grant_type: "authorization_code",
    };

    console.log("[oauth-callback] Request body (censored):", {
      hasCode: !!requestBody.code,
      hasClientId: !!requestBody.client_id,
      hasClientSecret: !!requestBody.client_secret,
      redirectUri: requestBody.redirect_uri,
      grantType: requestBody.grant_type,
    });

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const tokens = await tokenResponse.json();
    console.log("[oauth-callback] Token response:", {
      ok: tokenResponse.ok,
      status: tokenResponse.status,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      error: tokens.error,
      errorDescription: tokens.error_description,
    });

    if (!tokens.access_token) {
      console.error("[oauth-callback] FULL ERROR RESPONSE:", JSON.stringify(tokens, null, 2));
      throw new Error(`Failed to obtain access token: ${JSON.stringify(tokens)}`);
    }

    if (!tokens.refresh_token) {
      console.warn("[oauth-callback] No refresh token received - user may need to revoke access and reconnect");
    }

    // Get user's Gmail email
    console.log("[oauth-callback] Fetching user info...");
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoResponse.json();
    console.log("[oauth-callback] User info:", { email: userInfo.email, name: userInfo.name });

    // Get Clerk JWT token for authenticated Convex mutation
    console.log("[oauth-callback] Getting Clerk JWT token...");
    const { getToken } = await auth();
    const clerkToken = await getToken({ template: "convex" });

    console.log("[oauth-callback] Clerk token obtained:", !!clerkToken);
    console.log("[oauth-callback] Clerk token length:", clerkToken?.length || 0);

    if (!clerkToken) {
      console.error("[oauth-callback] No Clerk token available");
      throw new Error("Authentication failed: No Clerk token available");
    }

    // Create authenticated Convex client
    console.log("[oauth-callback] Creating authenticated Convex client...");
    console.log("[oauth-callback] Convex URL:", process.env.NEXT_PUBLIC_CONVEX_URL);
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(clerkToken);

    // Store tokens in Convex
    console.log("[oauth-callback] Storing in Convex...");
    console.log("[oauth-callback] Mutation params:", {
      clerkId: userId,
      gmailEmail: userInfo.email,
      displayName: userInfo.name || userInfo.email,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
    });

    let result;
    try {
      result = await convex.mutation(api.gmailAccounts.connectGmailAccount, {
        clerkId: userId,
        gmailEmail: userInfo.email,
        displayName: userInfo.name || userInfo.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || "",
      });
      console.log("[oauth-callback] Convex mutation result:", result);
    } catch (convexError) {
      console.error("[oauth-callback] Convex mutation failed:", convexError);
      console.error("[oauth-callback] Convex error details:", {
        message: convexError instanceof Error ? convexError.message : String(convexError),
        stack: convexError instanceof Error ? convexError.stack : "No stack trace",
      });
      throw new Error(`Failed to save Gmail account to database: ${convexError instanceof Error ? convexError.message : String(convexError)}`);
    }

    // Automatically enable push notifications for this account
    if (result && result.accountId) {
      try {
        console.log("[oauth-callback] Auto-enabling push notifications for:", userInfo.email);
        const watchResponse = await fetch(`${appUrl}/api/gmail-watch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: result.accountId }),
        });

        const watchData = await watchResponse.json();
        if (watchResponse.ok) {
          console.log("[oauth-callback] Push notifications enabled successfully:", {
            email: userInfo.email,
            historyId: watchData.historyId,
            expiresIn: watchData.expiresIn,
          });
        } else {
          console.error("[oauth-callback] Failed to enable push notifications:", {
            email: userInfo.email,
            status: watchResponse.status,
            error: watchData.error || watchData,
          });

          // Store the error in database so user can see it
          try {
            await convex.mutation(api.gmailAccounts.updatePushStatus, {
              accountId: result.accountId,
              enabled: false,
              error: watchData.error || JSON.stringify(watchData),
            });
          } catch (dbError) {
            console.error("[oauth-callback] Failed to store push error in DB:", dbError);
          }
        }
      } catch (watchError) {
        console.error("[oauth-callback] Error enabling push notifications:", {
          email: userInfo.email,
          error: watchError instanceof Error ? watchError.message : String(watchError),
        });

        // Store the error in database
        try {
          await convex.mutation(api.gmailAccounts.updatePushStatus, {
            accountId: result.accountId,
            enabled: false,
            error: watchError instanceof Error ? watchError.message : String(watchError),
          });
        } catch (dbError) {
          console.error("[oauth-callback] Failed to store push error in DB:", dbError);
        }
      }
    }

    // Redirect to the appropriate page with success flag and tab parameter
    const redirectUrl = new URL(returnUrl, appUrl);
    redirectUrl.searchParams.set("success", "gmail_connected");
    redirectUrl.searchParams.set("tab", "integrations");

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("OAuth callback error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // Redirect back to the returnUrl with error
    const redirectUrl = new URL(returnUrl, appUrl);
    redirectUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(redirectUrl.toString());
  }
}
