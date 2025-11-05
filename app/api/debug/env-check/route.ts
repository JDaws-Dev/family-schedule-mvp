import { NextResponse } from "next/server";

export async function GET() {
  const envVars = {
    NEXT_PUBLIC_CONVEX_URL: !!process.env.NEXT_PUBLIC_CONVEX_URL,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  };

  const allSet = Object.values(envVars).every(v => v === true);

  return NextResponse.json({
    allEnvironmentVariablesSet: allSet,
    variables: envVars,
    message: allSet
      ? "All required environment variables are set"
      : "Some environment variables are missing - check Vercel dashboard",
  });
}
