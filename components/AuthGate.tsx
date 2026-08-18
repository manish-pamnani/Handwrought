"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";
import RefreshLoader from "@/components/RefreshLoader";

// Guarantees a Firebase user exists before rendering children — but unlike a
// classic auth wall, an anonymous guest counts. Real sign-in/sign-up now
// happens later, opt-in, via the "Sign up to save" flow in TopBar.
export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signInGuest } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      signInGuest().catch((err) => console.error("guest sign-in failed:", err));
    }
  }, [loading, user, signInGuest]);

  if (loading || !user) {
    return <RefreshLoader />;
  }

  return <>{children}</>;
}
