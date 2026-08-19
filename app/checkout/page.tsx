"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

const inputClasses =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]";

export default function CheckoutPage() {
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
    <div className="flex min-h-screen flex-col bg-[var(--color-paper-inset)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-paper)] px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/handwrought-icon.svg" alt="" width={26} height={26} priority />
          <span className="font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            HandWrought
          </span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-tint)] font-sans text-lg text-[var(--color-accent)]">
          ✶
        </div>

        {joined ? (
          <>
            <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">You&apos;re on the list</h1>
            <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
              We&apos;ll email you the moment Lifetime Access is ready to buy. Your free credits are still yours in
              the meantime.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">Lifetime access is coming soon</h1>
            <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
              We&apos;re still finishing up billing for the one-time Lifetime Access purchase — unlimited,
              full-quality generations with no subscription. Join the waitlist and we&apos;ll email you the moment
              it&apos;s ready to buy.
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
    </div>
  );
}
