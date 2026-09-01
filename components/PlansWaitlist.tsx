"use client";

import { useState, type FormEvent } from "react";

// Shown by PlansPanel in place of the tier cards whenever CHECKOUT_READY is
// false (Paddle checkout not live yet) — used by both the plans modal and
// the inline /plans-and-credits section.
export default function PlansWaitlist() {
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

  if (joined) {
    return (
      <p className="py-6 text-center font-sans text-[13.5px] text-[var(--color-ink-muted)]">
        You&rsquo;re on the list — we&rsquo;ll email you the moment credits are ready to buy.
      </p>
    );
  }

  return (
    <div className="py-4 text-center">
      <p className="font-sans text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
        We&rsquo;re still finishing up billing for the one-time credit purchase. Join the waitlist and we&rsquo;ll
        email you the moment it&rsquo;s ready to buy.
      </p>
      <form onSubmit={handleSubmit} className="mx-auto mt-4 flex w-full max-w-xs flex-col gap-2.5">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]"
        />
        {error && <p className="font-sans text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
        >
          {submitting ? "Joining…" : "Join the waitlist"}
        </button>
      </form>
    </div>
  );
}
