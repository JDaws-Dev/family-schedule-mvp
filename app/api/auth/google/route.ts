import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get return URL from query params
  const searchParams = request.nextUrl.searchParams;
  const returnUrl = searchParams.get("returnUrl") || "/settings";

  // Construct the redirect URI using the request's origin as fallback
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  console.log("[google-auth] Initiating OAuth flow:", {
    appUrl,
    redirectUri,
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
  });

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "consent");
  // Encode returnUrl in the state parameter along with userId
  googleAuthUrl.searchParams.set("state", JSON.stringify({ userId, returnUrl }));

  console.log("[google-auth] Redirecting to:", googleAuthUrl.toString());

  return NextResponse.redirect(googleAuthUrl.toString());
}
