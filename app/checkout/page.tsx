"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";

const PRICE_LABEL = "$49";

const inputClasses =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]";

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  // Front-end only for now — no charge is actually processed. Wiring this up
  // to a real payment provider (creating a charge/session, handling
  // success/failure webhooks) is a follow-up once a provider account exists.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitting(false);
    setComplete(true);
  }

  if (complete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-paper-inset)] px-4">
        <div className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-tint)] font-sans text-xl text-[var(--color-accent)]">
            ✓
          </div>
          <h1 className="font-sans text-lg font-semibold text-[var(--color-ink)]">You&apos;re all set</h1>
          <p className="mt-2 font-sans text-[13px] text-[var(--color-ink-muted)]">
            Thanks for getting HandWrought. Sign in (or create an account) to start writing.
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

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-5 py-10 sm:flex-row sm:py-16">
        <section className="sm:w-2/5">
          <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">Order summary</h1>
          <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm font-medium text-[var(--color-ink)]">HandWrought — lifetime access</span>
              <span className="font-sans text-sm font-semibold text-[var(--color-ink)]">{PRICE_LABEL}</span>
            </div>
            <ul className="mt-4 flex flex-col gap-1.5 font-sans text-[13px] text-[var(--color-ink-muted)]">
              <li>Unlimited documents, no subscription</li>
              <li>All languages and tones</li>
              <li>Full formatting toolbar & Markdown export</li>
              <li>Free updates, forever</li>
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
              <span className="font-sans text-sm font-semibold text-[var(--color-ink)]">Total due today</span>
              <span className="font-sans text-base font-semibold text-[var(--color-ink)]">{PRICE_LABEL}</span>
            </div>
          </div>
          <p className="mt-3 font-sans text-xs text-[var(--color-ink-muted)]">
            You&apos;ll bring your own Gemini API key after checkout — HandWrought itself never sees your document
            content.
          </p>
        </section>

        <section className="sm:w-3/5">
          <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">Payment details</h1>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                placeholder="you@example.com"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">Name on card</span>
              <input
                type="text"
                required
                autoComplete="cc-name"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className={inputClasses}
                placeholder="Jane Doe"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">Card number</span>
              <input
                type="text"
                inputMode="numeric"
                required
                autoComplete="cc-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                className={inputClasses}
                placeholder="4242 4242 4242 4242"
                maxLength={19}
              />
            </label>

            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">Expiry</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  autoComplete="cc-exp"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  className={inputClasses}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">CVC</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  autoComplete="cc-csc"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className={inputClasses}
                  placeholder="123"
                  maxLength={4}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
            >
              {submitting ? "Processing…" : `Pay ${PRICE_LABEL}`}
            </button>
            <p className="text-center font-sans text-xs text-[var(--color-ink-muted)]">
              Payments are not yet live — this is a preview of the checkout flow.
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
