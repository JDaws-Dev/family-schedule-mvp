"use client";

import { ReactNode, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // Initialize clients inside the component to avoid build-time errors
  // Environment variables are only validated at runtime, not during static generation
  const convex = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
      // Return a client with a placeholder - will fail at runtime if actually used
      return new ConvexReactClient('https://placeholder.convex.cloud');
    }
    return new ConvexReactClient(convexUrl);
  }, []);

  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkKey) {
    console.error('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable');
  }

  return (
    <ClerkProvider
      publishableKey={clerkKey || 'pk_test_1234567890abcdefghijklmnopqrstuvwxyz1234567890'}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
