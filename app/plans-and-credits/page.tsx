"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAccess } from "@/lib/useAccess";
import AuthForm, { type AuthMode } from "@/components/AuthForm";
import UserMenu from "@/components/UserMenu";
import PlansModal from "@/components/PlansModal";
import PlansPanel from "@/components/PlansPanel";
import { TIER_CREDITS, TIER_NAMES } from "@/lib/constants";

function CreditsIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path strokeLinecap="round" d="M2.5 8h15" />
      <path strokeLinecap="round" d="M5 12h4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function PlansAndCreditsContent() {
  const { user } = useAuth();
  const access = useAccess();
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [plansModalOpen, setPlansModalOpen] = useState(false);

  if (!user || user.isAnonymous) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
        <div className="text-center">
          <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">
            {authMode === "signin" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="mt-1.5 font-sans text-[13.5px] text-[var(--color-ink-muted)]">
            Sign in to manage your plan and credits.
          </p>
        </div>
        <div className="mt-6">
          <AuthForm onSuccess={() => {}} onModeChange={setAuthMode} />
        </div>
      </main>
    );
  }

  const tier = access.tier;
  const creditsRemaining = access.creditsRemaining;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-10 sm:py-14">
      <h1 className="font-serif text-2xl font-semibold text-[var(--color-ink)]">Plans &amp; Credits</h1>
      <p className="mt-1.5 font-sans text-[13.5px] text-[var(--color-ink-muted)]">
        Manage your credits and see how they&apos;re being used.
      </p>

      <div className="mx-auto w-full max-w-2xl">
        <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] text-[var(--color-accent)]">
                <CreditsIcon />
              </div>
              <div>
                <p className="font-sans text-sm font-medium text-[var(--color-ink)]">Credits remaining</p>
                <p className="mt-0.5 font-sans text-xs text-[var(--color-ink-muted)]">
                  {tier ? "Never expire — buy more anytime" : "Buy a credit pack when you're ready for more"}
                </p>
              </div>
            </div>
            <p className="shrink-0 font-serif text-3xl font-semibold text-[var(--color-ink)]">
              {access.state === "ready" ? creditsRemaining : "—"}
            </p>
          </div>

          <Link
            href="/plans-and-credits/usage"
            className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 font-sans text-sm text-[var(--color-ink)] transition-colors hover:text-[var(--color-accent)]"
          >
            Check usage
            <ArrowIcon />
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
          <div>
            <p className="font-sans text-sm font-medium text-[var(--color-ink)]">
              {tier ? `${TIER_NAMES[tier]} pack` : "Free"}
            </p>
            <p className="mt-0.5 font-sans text-xs text-[var(--color-ink-muted)]">
              {tier
                ? `You've bought the ${TIER_NAMES[tier]} pack (${TIER_CREDITS[tier]} credits) — buy another pack anytime, it stacks.`
                : "You are currently on the free plan."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPlansModalOpen(true)}
            className="shrink-0 rounded-full border border-[var(--color-border)] px-4 py-2 font-sans text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
          >
            {tier ? "Buy more credits" : "Buy credits"}
          </button>
        </div>
      </div>

      <section className="mt-10 border-t border-[var(--color-border)] pt-8">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">Credit packs</h2>
        <p className="mt-1 font-sans text-[13px] text-[var(--color-ink-muted)]">
          A one-time payment, not a subscription — buy a credit pack and use it whenever you like. Credits never
          expire; buy another pack anytime you run low.
        </p>

        <PlansPanel
          userEmail={user.email}
          userUid={user.uid}
          currentTier={tier}
          onPurchaseComplete={access.refresh}
          doneLabel="Back to plans"
        />
      </section>

      <Link
        href="/"
        className="mt-8 self-center font-sans text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
      >
        Back to HandWrought
      </Link>

      <PlansModal
        open={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
        userEmail={user.email}
        userUid={user.uid}
        currentTier={tier}
        onPurchaseComplete={access.refresh}
      />
    </main>
  );
}

export default function PlansAndCreditsPage() {
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
      <PlansAndCreditsContent />
    </div>
  );
}
