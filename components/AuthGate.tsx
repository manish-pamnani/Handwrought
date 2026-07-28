"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";
import AuthForm from "@/components/AuthForm";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-sans text-sm text-[var(--color-ink-muted)]">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return <>{children}</>;
}
