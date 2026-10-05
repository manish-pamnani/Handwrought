"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import type { CheckoutEventsData } from "@paddle/paddle-js/types/checkout/events";
import { CHECKOUT_READY, EARLY_BIRD_DISCOUNT_ID, TIERS, TIER_NAMES, TIER_PRICE_IDS, TIER_TAGLINES, type Tier } from "@/lib/constants";
import PlansWaitlist from "./PlansWaitlist";
import TierFeatureList from "./TierFeatureList";

const POPULAR_TIER: Tier = "19";

function formatTotal(totals: CheckoutEventsData["totals"], currencyCode: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(totals.total);
}

export type PlansPanelProps = {
  userEmail: string | null | undefined;
  userUid: string;
  currentTier: Tier | null;
  /** called once a purchase completes, so the caller can refresh its own credits/tier display */
  onPurchaseComplete?: () => void;
  /** called when the success screen's action button is pressed, in addition to resetting the panel back to the plan list */
  onDone?: () => void;
  doneLabel?: string;
  /** rendered above the tier cards — omitted once the success screen is showing */
  header?: ReactNode;
};

// The tier cards + Paddle checkout wiring, shared by the PlansModal overlay
// and the inline "Credit packs" section on /plans-and-credits so both stay
// in sync with one implementation.
export default function PlansPanel({
  userEmail,
  userUid,
  currentTier,
  onPurchaseComplete,
  onDone,
  doneLabel = "Done",
  header,
}: PlansPanelProps) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutEventsData | null>(null);
  const [complete, setComplete] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // Events keep firing after checkout.completed (e.g. checkout.closed), some with
  // stale/zeroed totals — freeze on the first completed event and ignore the rest.
  const completedRef = useRef(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current || !CHECKOUT_READY) return;
    initRef.current = true;
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
          onPurchaseComplete?.();
          return;
        }
        if (event.name === "checkout.error") {
          setCheckoutError("Something went wrong opening checkout. Please try again in a moment.");
        }
        if (event.data) setCheckoutData(event.data);
      },
    }).then((p) => {
      if (p) setPaddle(p);
    });
    // Runs once per mount — the panel either lives for the page's whole
    // lifetime or (inside the modal) remounts fresh on every open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same launch discount as /checkout's TierCard — see that file for the
  // full rationale. Kept in sync manually since the price math here is
  // display-only either way; Paddle applies the real discount server-side.
  const earlyBirdActive = Boolean(EARLY_BIRD_DISCOUNT_ID);

  function openCheckout(tier: Tier) {
    if (!paddle) return;
    paddle.Checkout.open({
      items: [{ priceId: TIER_PRICE_IDS[tier], quantity: 1 }],
      ...(earlyBirdActive && { discountId: EARLY_BIRD_DISCOUNT_ID }),
      ...(userEmail && { customer: { email: userEmail } }),
      customData: { firebaseUid: userUid },
    });
  }

  function handleDone() {
    completedRef.current = false;
    setComplete(false);
    setCheckoutData(null);
    onDone?.();
  }

  if (complete) {
    const paidLabel = checkoutData ? formatTotal(checkoutData.totals, checkoutData.currency_code) : null;
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-tint)] font-sans text-lg text-[var(--color-accent)]">
          ✶
        </div>
        <h2 className="font-serif text-xl font-semibold text-[var(--color-ink)]">You&rsquo;re all set</h2>
        <p className="mt-2 max-w-xs font-sans text-[13.5px] text-[var(--color-ink-muted)]">
          Thanks for getting HandWrought{paidLabel ? ` (${paidLabel} paid)` : ""}. Your credits are live on your
          account now.
        </p>
        <button
          onClick={handleDone}
          className="mt-5 rounded-full bg-[var(--color-accent)] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          {doneLabel}
        </button>
      </div>
    );
  }

  return (
    <div>
      {header}

      {earlyBirdActive && (
        <p className="mt-3 text-center font-sans text-[12.5px] font-medium text-[var(--color-accent)]">
          🎉 Founding Member pricing — 25% off, first 200 customers only.
        </p>
      )}

      {checkoutError && (
        <p className="mt-4 text-center font-sans text-xs text-red-600" role="alert">
          {checkoutError}
        </p>
      )}

      {CHECKOUT_READY ? (
        <div className="mt-6 flex flex-col gap-4 sm:flex-row">
          {TIERS.map((tier) => {
            const popular = tier === POPULAR_TIER;
            const owned = currentTier === tier;
            const earlyBirdPrice = (Number(tier) * 0.75).toFixed(2).replace(/\.00$/, "");
            return (
              <div
                key={tier}
                className={`relative flex flex-1 flex-col rounded-xl border p-5 ${
                  popular
                    ? "border-[var(--color-accent)] bg-[var(--color-paper)]"
                    : "border-[var(--color-border)] bg-[var(--color-paper)]"
                }`}
              >
                {popular && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-[var(--color-accent)] px-2.5 py-0.5 font-sans text-[11px] font-semibold text-white">
                    Popular
                  </span>
                )}
                <p className="font-sans text-base font-semibold text-[var(--color-ink)]">{TIER_NAMES[tier]}</p>
                <p className="font-sans text-xs text-[var(--color-ink-muted)]">{TIER_TAGLINES[tier]}</p>
                <p className="mt-2 font-serif text-3xl font-semibold text-[var(--color-ink)]">
                  {earlyBirdActive ? (
                    <>
                      ${earlyBirdPrice}
                      <span className="ml-1.5 font-sans text-base font-normal text-[var(--color-ink-muted)] line-through">
                        ${tier}
                      </span>
                    </>
                  ) : (
                    <>${tier}</>
                  )}
                  <span className="font-sans text-sm font-normal text-[var(--color-ink-muted)]"> once</span>
                </p>

                <TierFeatureList tier={tier} />

                <button
                  type="button"
                  onClick={() => openCheckout(tier)}
                  disabled={!paddle}
                  className="mt-5 w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40 hover:cursor-pointer"
                >
                  {paddle ? (owned ? "Buy another" : "Continue") : "Loading…"}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <PlansWaitlist />
      )}

      <p className="mt-6 text-center font-sans text-xs text-[var(--color-ink-muted)]">
        1 credit = 1 AI generation. Final price and any local taxes are shown in checkout.
      </p>
    </div>
  );
}
