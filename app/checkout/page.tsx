"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import type { CheckoutEventsData } from "@paddle/paddle-js/types/checkout/events";
import { useAuth } from "@/lib/AuthContext";
import { PADDLE_CHECKOUT_ENABLED, TIER_CREDITS, TIER_PRICE_IDS, type Tier } from "@/lib/constants";

const TIERS: Tier[] = ["9", "19", "29"];

const inputClasses =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]";

// Requires the explicit PADDLE_CHECKOUT_ENABLED go-live switch (see
// lib/constants.ts — off until Paddle's domain verification is done), and
// guards against shipping a broken checkout if price IDs haven't been
// populated yet either way. Falls back to the waitlist form otherwise.
const CHECKOUT_READY = PADDLE_CHECKOUT_ENABLED && TIERS.every((tier) => TIER_PRICE_IDS[tier]);

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
  function openCheckout() {
    if (!paddle) return;
    paddle.Checkout.open({
      items: [{ priceId: TIER_PRICE_IDS[tier], quantity: 1 }],
      ...(userEmail && { customer: { email: userEmail } }),
      // Threaded through to the transaction.completed webhook so it knows
      // which account to grant credits to. Guest checkouts (no signed-in
      // session yet — e.g. a direct link that skipped the editor) omit this.
      ...(userUid && { customData: { firebaseUid: userUid } }),
    });
  }

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
      <p className="font-sans text-sm font-medium text-[var(--color-ink-muted)]">Credits</p>
      <p className="mt-1 font-serif text-3xl font-semibold text-[var(--color-ink)]">
        ${tier}
        <span className="font-sans text-sm font-normal text-[var(--color-ink-muted)]"> once</span>
      </p>
      <p className="mt-1 font-sans text-[13px] text-[var(--color-ink-muted)]">
        {TIER_CREDITS[tier]} credits/month, refreshing automatically — forever
      </p>
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

function PaddleCheckout() {
  const { user } = useAuth();
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutEventsData | null>(null);
  const [complete, setComplete] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
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

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-6 px-5 py-10 sm:py-16">
      <div className="text-center">
        <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">Credits</h1>
        <p className="mt-1.5 font-sans text-[13.5px] text-[var(--color-ink-muted)]">
          One-time payment, not a subscription — pick a credit tier once and it refreshes every month, for as long as
          you use HandWrought.
        </p>
      </div>

      {checkoutError && (
        <p className="font-sans text-xs text-red-600" role="alert">
          {checkoutError}
        </p>
      )}

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
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-paper-inset)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-paper)] px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/handwrought-icon.svg" alt="" width={26} height={26} priority />
          <span className="font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            HandWrought
          </span>
        </Link>
      </header>
      <Suspense fallback={null}>
        <CheckoutContents />
      </Suspense>
    </div>
  );
}
