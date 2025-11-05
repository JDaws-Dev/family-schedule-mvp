"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function UserInitializer({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [initialized, setInitialized] = useState(false);

  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const existingUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !user || initialized) return;

    // If user already exists in Convex, we're done
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
        })
        .catch((error) => {
          console.error("Failed to initialize user:", error);
        });
    }
  }, [user, isLoaded, existingUser, initialized, getOrCreateUser]);

  return <>{children}</>;
}
