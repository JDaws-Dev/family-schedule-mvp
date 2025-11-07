"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error(
    'Missing NEXT_PUBLIC_CONVEX_URL environment variable. ' +
    'Please set it in your Vercel environment variables. ' +
    'Get your URL from: https://dashboard.convex.dev'
  );
}

if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable. ' +
    'Please set it in your Vercel environment variables. ' +
    'Get your key from: https://dashboard.clerk.com/last-active?path=api-keys'
  );
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
