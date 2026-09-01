"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import AuthForm, { type AuthMode } from "@/components/AuthForm";
import UserMenu from "@/components/UserMenu";
import type { Tier } from "@/lib/constants";

type UsageEvent = {
  id: string;
  type: "chat" | "import";
  spent: "credit" | "free";
  createdAt: string | null;
};

type UsageData = {
  tier: Tier | null;
  creditsRemaining: number;
  freeGenerationsUsed: number;
  freeGenerationsLimit: number;
  events: UsageEvent[];
};

const TYPE_LABEL: Record<UsageEvent["type"], string> = {
  chat: "Writing generation",
  import: "Document import",
};

function BackIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 8H3M7 4L3 8l4 4" />
    </svg>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function UsageContent() {
  const { user } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<UsageData | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/usage", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("usage fetch failed");
      const json: UsageData = await res.json();
      setData(json);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user]);

  // Fetching usage history calls out to an external system (our API, backed
  // by Firestore) — this necessarily sets state from an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!user || user.isAnonymous) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
        <div className="text-center">
          <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">
            {authMode === "signin" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="mt-1.5 font-sans text-[13.5px] text-[var(--color-ink-muted)]">
            Sign in to see your usage history.
          </p>
        </div>
        <div className="mt-6">
          <AuthForm onSuccess={() => {}} onModeChange={setAuthMode} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10 sm:py-14">
      <Link
        href="/plans-and-credits"
        className="flex w-fit items-center gap-1.5 font-sans text-xs text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
      >
        <BackIcon />
        Plans &amp; Credits
      </Link>

      <h1 className="mt-3 font-serif text-2xl font-semibold text-[var(--color-ink)]">Usage</h1>
      <p className="mt-1.5 font-sans text-[13.5px] text-[var(--color-ink-muted)]">
        Every generation that used a credit or a free try, most recent first.
      </p>

      {state === "error" && (
        <p className="mt-6 font-sans text-[13px] text-red-600">Couldn&rsquo;t load your usage — try again in a moment.</p>
      )}

      {data && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4">
            <p className="font-sans text-xs text-[var(--color-ink-muted)]">Credits remaining</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-[var(--color-ink)]">{data.creditsRemaining}</p>
          </div>
          {data.tier ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4">
              <p className="font-sans text-xs text-[var(--color-ink-muted)]">Expiration</p>
              <p className="mt-1 font-sans text-sm font-medium text-[var(--color-ink)]">Never</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4">
              <p className="font-sans text-xs text-[var(--color-ink-muted)]">Free generations used</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-[var(--color-ink)]">
                {data.freeGenerationsUsed}/{data.freeGenerationsLimit}
              </p>
            </div>
          )}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4">
            <p className="font-sans text-xs text-[var(--color-ink-muted)]">Plan</p>
            <p className="mt-1 font-sans text-sm font-medium text-[var(--color-ink)]">
              {data.tier ? `$${data.tier} pack` : "Free"}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)]">
        {state === "loading" && (
          <p className="px-4 py-6 text-center font-sans text-[13px] text-[var(--color-ink-muted)]">Loading…</p>
        )}
        {state === "ready" && data && data.events.length === 0 && (
          <p className="px-4 py-6 text-center font-sans text-[13px] text-[var(--color-ink-muted)]">
            No generations yet — your usage history will show up here.
          </p>
        )}
        {state === "ready" && data && data.events.length > 0 && (
          <ul className="divide-y divide-[var(--color-border)]">
            {data.events.map((event) => (
              <li key={event.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-sans text-[13px] font-medium text-[var(--color-ink)]">{TYPE_LABEL[event.type]}</p>
                  <p className="mt-0.5 font-sans text-xs text-[var(--color-ink-muted)]">{formatDate(event.createdAt)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--color-paper-inset)] px-2.5 py-1 font-sans text-xs font-medium text-[var(--color-ink-muted)]">
                  {event.spent === "credit" ? "1 credit" : "Free generation"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default function UsagePage() {
  const { user, signOutUser } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-paper-inset)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-paper)] px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/handwrought-icon.svg" alt="" width={26} height={26} priority />
          <span className="font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            HandWrought
          </span>
        </Link>
        {user && !user.isAnonymous && <UserMenu user={user} onSignOut={signOutUser} />}
      </header>
      <UsageContent />
    </div>
  );
}
