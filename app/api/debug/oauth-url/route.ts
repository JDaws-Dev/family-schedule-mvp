import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "MISSING");
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "consent");
  googleAuthUrl.searchParams.set("state", JSON.stringify({ userId: "test", returnUrl: "/settings" }));

  return NextResponse.json({
    appUrl,
    redirectUri,
    clientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 15)}...` : "MISSING",
    clientIdLength: process.env.GOOGLE_CLIENT_ID?.length,
    clientIdHasNewline: process.env.GOOGLE_CLIENT_ID?.includes('\n'),
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? `${process.env.GOOGLE_CLIENT_SECRET.substring(0, 10)}...` : "MISSING",
    clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length,
    clientSecretHasNewline: process.env.GOOGLE_CLIENT_SECRET?.includes('\n'),
    fullUrl: googleAuthUrl.toString(),
  });
}
