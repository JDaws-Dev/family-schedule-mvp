"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";

export function UserInitializer({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const existingUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get family members to check if onboarding is complete
  const familyMembers = useQuery(
    api.familyMembers.getFamilyMembers,
    existingUser?.familyId ? { familyId: existingUser.familyId } : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !user || initialized) return;

    // If user already exists in Convex, we're done initializing
    if (existingUser !== undefined && existingUser !== null) {
      setInitialized(true);
      return;
    }

    // If we've checked and user doesn't exist, create them
    if (existingUser === null) {
      getOrCreateUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        fullName: user.fullName || undefined,
        phoneNumber: user.primaryPhoneNumber?.phoneNumber || undefined,
      })
        .then(() => {
          setInitialized(true);
          // Redirect new users to onboarding
          if (pathname !== "/onboarding") {
            router.push("/onboarding");
          }
        })
        .catch((error) => {
          console.error("Failed to initialize user:", error);
        });
    }
  }, [user, isLoaded, existingUser, initialized, getOrCreateUser, router, pathname]);

  // Check if existing user needs onboarding
  useEffect(() => {
    if (!initialized || !existingUser || !isLoaded) return;

    // Don't redirect if already on onboarding, auth pages, or pages that don't require family members
    const excludedPaths = ["/onboarding", "/sign-in", "/sign-up", "/review", "/settings", "/dashboard"];
    if (excludedPaths.some(path => pathname?.startsWith(path))) return;

    // If user has no family members, they haven't completed onboarding
    if (familyMembers !== undefined && familyMembers.length === 0) {
      router.push("/onboarding");
    }
  }, [initialized, existingUser, familyMembers, router, pathname, isLoaded]);

  return <>{children}</>;
}
