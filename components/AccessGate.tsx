"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";

type AccessState = "checking" | "granted" | "denied" | "error";

export default function AccessGate({ children }: { children: ReactNode }) {
  const { user, signOutUser } = useAuth();
  const [state, setState] = useState<AccessState>("checking");

  // AuthGate only ever renders this component once `user` is non-null.
  const runCheck = useCallback(async () => {
    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/access", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("access check failed");
      const data: { lifetimeAccess: boolean } = await res.json();
      setState(data.lifetimeAccess ? "granted" : "denied");
    } catch {
      setState("error");
    }
  }, [user]);

  // Checking access means calling out to an external system (our API, backed
  // by Firestore) — this necessarily sets state from an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    runCheck();
  }, [runCheck]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function retryCheck() {
    setState("checking");
    runCheck();
  }

  if (state === "checking") {
    return (
      <div className="flex h-screen items-center justify-center font-sans text-sm text-[var(--color-ink-muted)]">
        Checking your account…
      </div>
    );
  }

  if (state === "granted") {
    return <>{children}</>;
  }

  const isError = state === "error";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-paper-inset)] px-4">
      <div className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-6 text-center shadow-sm">
        <h1 className="font-serif text-lg font-semibold text-[var(--color-ink)]">
          {isError ? "Couldn't check your account" : "Get lifetime access"}
        </h1>
        <p className="mt-2 font-sans text-[13px] text-[var(--color-ink-muted)]">
          {isError
            ? "Something went wrong checking your access. Please try again."
            : "This account hasn't unlocked HandWrought yet. Grab lifetime access — a one-time $9.99 payment, no subscription — to start writing."}
        </p>

        {isError ? (
          <button
            type="button"
            onClick={retryCheck}
            className="mt-5 w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Try again
          </button>
        ) : (
          <>
            <Link
              href="/checkout"
              className="mt-5 block w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-center font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Get lifetime access — $9.99
            </Link>
            <button
              type="button"
              onClick={retryCheck}
              className="mt-3 w-full font-sans text-xs text-[var(--color-ink-muted)] underline transition-colors hover:text-[var(--color-ink)]"
            >
              Already paid? Refresh access
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => signOutUser()}
          className="mt-4 w-full font-sans text-xs text-[var(--color-ink-muted)] underline transition-colors hover:text-[var(--color-ink)]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
