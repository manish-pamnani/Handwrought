"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import type { CheckoutEventsData } from "@paddle/paddle-js/types/checkout/events";
import { useAuth } from "@/lib/AuthContext";
import { useAccess, type UseAccessResult } from "@/lib/useAccess";
import RefreshLoader from "@/components/RefreshLoader";
import {
  CHECKOUT_READY,
  EARLY_BIRD_DISCOUNT_ID,
  TIER_NAMES,
  TIER_PRICE_IDS,
  TIER_TAGLINES,
  TIERS,
  type Tier,
} from "@/lib/constants";
import AuthForm, { type AuthMode } from "@/components/AuthForm";
import UserMenu from "@/components/UserMenu";
import TierFeatureList from "@/components/TierFeatureList";

const inputClasses =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]";

function formatTotal(totals: CheckoutEventsData["totals"], currencyCode: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(totals.total);
}

function WaitlistCheckout() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong — try again.");
      }
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-tint)] font-sans text-lg text-[var(--color-accent)]">
        ✶
      </div>

      {joined ? (
        <>
          <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">You&apos;re on the list</h1>
          <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
            We&apos;ll email you the moment credits are ready to buy. Your free credits are still yours in the
            meantime.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">Credits are coming soon</h1>
          <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
            We&apos;re still finishing up billing for the one-time credit purchase — a monthly credit
            allotment with no subscription. Join the waitlist and we&apos;ll email you the moment it&apos;s ready to
            buy.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex w-full flex-col gap-3 text-left">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
              placeholder="you@example.com"
            />
            {error && <p className="font-sans text-[13px] text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-center font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
            >
              {submitting ? "Joining…" : "Join the waitlist"}
            </button>
          </form>
        </>
      )}

      <Link
        href="/"
        className="mt-7 w-full rounded-full border border-[var(--color-border)] px-4 py-2.5 text-center font-sans text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)]"
      >
        Back to HandWrought
      </Link>
    </main>
  );
}

function TierCard({ tier, paddle, userEmail, userUid }: { tier: Tier; paddle: Paddle | null; userEmail: string | null | undefined; userUid: string | undefined }) {
  const earlyBirdActive = Boolean(EARLY_BIRD_DISCOUNT_ID);
  // Shown up front so the discount is obvious before checkout even opens —
  // Paddle applies the real one server-side; this is just the same 25% off
  // for display. Not shown at all once the live discount hasn't been set up
  // yet (EARLY_BIRD_DISCOUNT_ID empty) or after Paddle's own 200-redemption
  // cap is hit, at which point Checkout.open() just silently stops applying
  // it and the customer pays the listed price — no app-side tracking needed.
  const earlyBirdPrice = (Number(tier) * 0.75).toFixed(2).replace(/\.00$/, "");

  function openCheckout() {
    if (!paddle) return;
    paddle.Checkout.open({
      items: [{ priceId: TIER_PRICE_IDS[tier], quantity: 1 }],
      ...(earlyBirdActive && { discountId: EARLY_BIRD_DISCOUNT_ID }),
      ...(userEmail && { customer: { email: userEmail } }),
      // Threaded through to the transaction.completed webhook so it knows
      // which account to grant credits to. Guest checkouts (no signed-in
      // session yet — e.g. a direct link that skipped the editor) omit this.
      ...(userUid && { customData: { firebaseUid: userUid } }),
    });
  }

  return (
    <div className="relative flex flex-1 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
      {earlyBirdActive && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-[var(--color-accent)] px-2.5 py-0.5 font-sans text-[11px] font-semibold text-white">
          Founding Member — 25% off
        </span>
      )}
      <p className="font-sans text-base font-semibold text-[var(--color-ink)]">{TIER_NAMES[tier]}</p>
      <p className="font-sans text-xs text-[var(--color-ink-muted)]">{TIER_TAGLINES[tier]}</p>
      <p className="mt-2 font-serif text-3xl font-semibold text-[var(--color-ink)]">
        {earlyBirdActive ? (
          <>
            ${earlyBirdPrice}
            <span className="ml-1.5 font-sans text-base font-normal text-[var(--color-ink-muted)] line-through">${tier}</span>
          </>
        ) : (
          <>${tier}</>
        )}
        <span className="font-sans text-sm font-normal text-[var(--color-ink-muted)]"> once</span>
      </p>
      <TierFeatureList tier={tier} />
      <button
        type="button"
        onClick={openCheckout}
        disabled={!paddle}
        className="mt-4 w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
      >
        {paddle ? "Buy now" : "Loading…"}
      </button>
    </div>
  );
}

function CurrentPlanCard({ access }: { access: UseAccessResult }) {
  // PaddleCheckout already blocks on access.state === "loading" before this
  // ever renders — this only guards the "error" case (fetch failed), where
  // showing useAccess's zeroed-out defaults would misrepresent a real
  // customer's balance. Hide rather than show a wrong number.
  if (access.state !== "ready") return null;

  return (
    <div className="flex w-full max-w-3xl items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
      <div>
        <p className="font-sans text-sm font-medium text-[var(--color-ink)]">
          {access.tier ? `${TIER_NAMES[access.tier]} pack` : "No credits purchased yet"}
        </p>
        <p className="mt-0.5 font-sans text-xs text-[var(--color-ink-muted)]">
          {access.tier
            ? "Buying another pack below adds to what you have left — it stacks, nothing is lost."
            : "Pick a pack below to get started."}
        </p>
      </div>
      <p className="font-serif text-2xl font-semibold text-[var(--color-ink)]">
        {access.creditsRemaining}
        <span className="ml-1 font-sans text-xs font-normal text-[var(--color-ink-muted)]">left</span>
      </p>
    </div>
  );
}

function PaddleCheckout() {
  const { user, loading } = useAuth();
  const access = useAccess();
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutEventsData | null>(null);
  const [complete, setComplete] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  // Events keep firing after checkout.completed (e.g. checkout.closed), some with
  // stale/zeroed totals — freeze on the first completed event and ignore the rest.
  const completedRef = useRef(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENV;
    if (!token || !environment) return;

    initializePaddle({
      token,
      environment: environment as "sandbox" | "production",
      eventCallback: (event) => {
        if (!event.name || completedRef.current) return;
        if (event.name === "checkout.completed" && event.data) {
          completedRef.current = true;
          setCheckoutData(event.data);
          setComplete(true);
          return;
        }
        if (event.name === "checkout.error") {
          setCheckoutError("Something went wrong opening checkout. Please try again in a moment.");
        }
        if (event.data) {
          setCheckoutData(event.data);
        }
      },
    }).then((p) => {
      if (p) setPaddle(p);
    });
  }, []);

  if (complete) {
    const paidLabel = checkoutData ? formatTotal(checkoutData.totals, checkoutData.currency_code) : null;
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <div className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-tint)] font-sans text-lg text-[var(--color-accent)]">
            ✶
          </div>
          <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">You&apos;re all set</h1>
          <p className="mt-2 font-sans text-[13.5px] text-[var(--color-ink-muted)]">
            Thanks for getting HandWrought{paidLabel ? ` (${paidLabel} paid)` : ""}. Your credits are live on your
            account now.
          </p>
          <Link
            href="/"
            className="mt-5 block w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-center font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Start writing
          </Link>
        </div>
      </main>
    );
  }

  // Credits are granted to a Firebase uid (see lib/paddleWebhookHandlers.ts).
  // An anonymous guest already has one, but it only lives in this browser's
  // storage — losing it after paying means losing the credits with no way to
  // recover them. Require a real account before Paddle checkout can open.
  //
  // Never render a half-loaded state (blank page, or the sign-up form
  // flashing before a real, already-signed-in session is confirmed, or
  // "$0 left" before the real balance loads) — show the same loader used
  // elsewhere until both auth and the credits fetch have actually settled.
  if (loading) return <RefreshLoader />;
  if (!user || user.isAnonymous) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
        <div className="text-center">
          <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">
            {authMode === "signin" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="mt-1.5 font-sans text-[13.5px] text-[var(--color-ink-muted)]">
            Credits are tied to your account, not just this browser — sign in or create one so you never lose
            access to what you paid for.
          </p>
        </div>
        <div className="mt-6">
          <AuthForm onSuccess={() => {}} onModeChange={setAuthMode} />
        </div>
      </main>
    );
  }

  // A confirmed, non-anonymous user — but their credits balance is still in
  // flight (common right after a refresh, e.g. right after completing a
  // purchase). Wait for the real number rather than letting CurrentPlanCard
  // show nothing while everything around it has already rendered.
  if (access.state === "loading") return <RefreshLoader />;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-6 px-5 py-10 sm:py-16">
      <div className="text-center">
        <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">Credits</h1>
        <p className="mt-1.5 font-sans text-[13.5px] text-[var(--color-ink-muted)]">
          A one-time payment, not a subscription — buy a credit pack and use it whenever you like. Credits never
          expire; buy another pack anytime you run low.
        </p>
      </div>

      {Boolean(EARLY_BIRD_DISCOUNT_ID) && (
        <div className="w-full max-w-3xl rounded-lg border border-[var(--color-accent-tint-border)] bg-[var(--color-accent-tint)] px-4 py-3 text-center">
          <p className="font-sans text-[13px] font-medium text-[var(--color-ink)]">
            🎉 Founding Member pricing — 25% off every tier, first 200 customers only.
          </p>
          <p className="mt-0.5 font-sans text-xs text-[var(--color-ink-muted)]">
            Same credits, same tiers — just the launch price. Once the first 200 are gone, everyone pays the
            regular price shown above.
          </p>
        </div>
      )}

      {checkoutError && (
        <p className="font-sans text-xs text-red-600" role="alert">
          {checkoutError}
        </p>
      )}

      <CurrentPlanCard access={access} />

      <div className="flex w-full max-w-3xl flex-col gap-4 sm:flex-row">
        {TIERS.map((tier) => (
          <TierCard key={tier} tier={tier} paddle={paddle} userEmail={user?.email} userUid={user?.uid} />
        ))}
      </div>

      <p className="text-center font-sans text-xs text-[var(--color-ink-muted)]">
        Final price and any local taxes are shown in checkout — Paddle adjusts pricing automatically for your
        country.
      </p>
    </main>
  );
}

function CheckoutContents() {
  return CHECKOUT_READY ? <PaddleCheckout /> : <WaitlistCheckout />;
}

export default function CheckoutPage() {
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
      <Suspense fallback={null}>
        <CheckoutContents />
      </Suspense>
    </div>
  );
}
