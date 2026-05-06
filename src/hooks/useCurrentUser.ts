"use client";

import { useSession } from "next-auth/react";

export interface CurrentUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function useCurrentUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user as CurrentUser | undefined,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  };
}
