"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import type { CheckoutEventsData } from "@paddle/paddle-js/types/checkout/events";
import { useAuth } from "@/lib/AuthContext";
import { EARLY_BIRD_DISCOUNT_CODE, LIFETIME_ACCESS_PRICE_ID } from "@/lib/constants";

const REGULAR_PRICE_LABEL = "$9.99";
const EARLY_BIRD_PRICE_LABEL = "$4.99";

function formatTotal(totals: CheckoutEventsData["totals"], currencyCode: string): string {
  // Paddle.js checkout events report totals in major currency units (e.g. 9.99),
  // unlike the server-side Transactions API which uses minor-unit strings ("999").
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(
    totals.total,
  );
}

function CheckoutContents() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Supports a "buy now with early bird" link, e.g. /checkout?promo=EARLYBIRD50
  const promoParam = searchParams.get("promo")?.trim().toUpperCase() ?? null;
  const earlyBirdApplied = promoParam === EARLY_BIRD_DISCOUNT_CODE;

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

  function openCheckout() {
    if (!paddle) return;
    setCheckoutError(null);
    paddle.Checkout.open({
      items: [{ priceId: LIFETIME_ACCESS_PRICE_ID, quantity: 1 }],
      ...(earlyBirdApplied && { discountCode: EARLY_BIRD_DISCOUNT_CODE }),
      ...(user?.email && { customer: { email: user.email } }),
      // Threaded through to the transaction.completed webhook so it knows
      // which account to grant lifetime access to. Guest checkouts (no
      // signed-in user) omit this — see the TODO in paddleWebhookHandlers.ts.
      ...(user?.uid && { customData: { firebaseUid: user.uid } }),
    });
  }

  if (complete) {
    const paidLabel = checkoutData ? formatTotal(checkoutData.totals, checkoutData.currency_code) : null;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-paper-inset)] px-4">
        <div className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-tint)] font-sans text-xl text-[var(--color-accent)]">
            ✓
          </div>
          <h1 className="font-sans text-lg font-semibold text-[var(--color-ink)]">You&apos;re all set</h1>
          <p className="mt-2 font-sans text-[13px] text-[var(--color-ink-muted)]">
            Thanks for getting HandWrought{paidLabel ? ` (${paidLabel} paid)` : ""}. Sign in (or create an account) to
            start writing.
          </p>
          <Link
            href="/app"
            className="mt-6 block w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-center font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Continue to HandWrought
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-paper-inset)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-paper)] px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/handwrought-icon.svg" alt="" width={26} height={26} priority />
          <span className="font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            HandWrought
          </span>
        </Link>
        <Link
          href="/"
          className="font-sans text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          Cancel
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-8 px-5 py-10 sm:py-16">
        <section className="w-full max-w-sm">
          <h1 className="text-center font-serif text-xl font-semibold text-[var(--color-ink)]">Order summary</h1>
          <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm font-medium text-[var(--color-ink)]">HandWrought — lifetime access</span>
              <span className="font-sans text-sm font-semibold text-[var(--color-ink)]">
                {earlyBirdApplied ? (
                  <>
                    <span className="mr-1.5 text-[var(--color-ink-muted)] line-through">{REGULAR_PRICE_LABEL}</span>
                    {EARLY_BIRD_PRICE_LABEL}
                  </>
                ) : (
                  REGULAR_PRICE_LABEL
                )}
              </span>
            </div>
            {earlyBirdApplied && (
              <p className="mt-1.5 font-sans text-xs font-medium text-[var(--color-accent)]">
                Early bird code EARLYBIRD50 applied — 50% off
              </p>
            )}
            <ul className="mt-4 flex flex-col gap-1.5 font-sans text-[13px] text-[var(--color-ink-muted)]">
              <li>Full editor: tone, synonyms, improve, shorten, expand, grammar — unlimited</li>
              <li>One-time payment, no subscription</li>
              <li>Free updates, forever</li>
            </ul>
            <p className="mt-4 border-t border-[var(--color-border)] pt-4 font-sans text-xs text-[var(--color-ink-muted)]">
              Requires your own Gemini API key. Final price and any local taxes are shown in the checkout — Paddle
              adjusts pricing automatically for your country.
            </p>
          </div>

          {checkoutError && (
            <p className="mt-3 font-sans text-xs text-red-600" role="alert">
              {checkoutError}
            </p>
          )}

          <button
            type="button"
            onClick={openCheckout}
            disabled={!paddle}
            className="mt-5 w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
          >
            {paddle ? "Buy now" : "Loading checkout…"}
          </button>
          <p className="mt-3 text-center font-sans text-xs text-[var(--color-ink-muted)]">
            Have a different promo code? You can enter it inside checkout too.
          </p>
        </section>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutContents />
    </Suspense>
  );
}

// TODO: transaction.completed webhook — on receipt, look up the transaction's
// customer email/customData and set a lifetime-access flag for that user in
// Firestore. This client flow only shows a success screen; it does not grant
// access. See the paddle:webhooks skill for the Route Handler + signature
// verification pattern.
