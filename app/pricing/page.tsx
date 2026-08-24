import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FREE_GENERATIONS_LIMIT, TIER_CREDITS, type Tier } from "@/lib/constants";

export const metadata: Metadata = { title: "Pricing — HandWrought" };

const TIERS: Tier[] = ["9", "19", "29"];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-paper-inset)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-paper)] px-5 py-4 sm:px-8">
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
          Back home
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-8 px-5 py-12 sm:py-16">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">Pricing</h1>
          <p className="mt-2 max-w-md font-sans text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
            Start free, no card required. Lifetime Access is a one-time payment — not a subscription — that unlocks
            a monthly credit allotment which refreshes for as long as you use HandWrought.
          </p>
        </div>

        <div className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
          <p className="font-sans text-sm font-medium text-[var(--color-ink-muted)]">Free</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[var(--color-ink)]">$0</p>
          <p className="mt-1 font-sans text-[13px] text-[var(--color-ink-muted)]">
            {FREE_GENERATIONS_LIMIT} free generations, no signup required
          </p>
        </div>

        <div className="flex w-full max-w-3xl flex-col gap-4 sm:flex-row">
          {TIERS.map((tier) => (
            <div
              key={tier}
              className="flex flex-1 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5"
            >
              <p className="font-sans text-sm font-medium text-[var(--color-ink-muted)]">Lifetime Access</p>
              <p className="mt-1 font-serif text-3xl font-semibold text-[var(--color-ink)]">
                ${tier}
                <span className="font-sans text-sm font-normal text-[var(--color-ink-muted)]"> once</span>
              </p>
              <p className="mt-1 font-sans text-[13px] text-[var(--color-ink-muted)]">
                {TIER_CREDITS[tier]} credits/month, refreshing automatically — forever
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/checkout"
            className="inline-block rounded-full bg-[var(--color-accent)] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Get Lifetime Access
          </Link>
          <p className="mt-3 font-sans text-xs text-[var(--color-ink-muted)]">
            Every AI generation — an outline, a rewrite, or a quick edit — uses 1 credit. Refunds available within 14
            days, see our{" "}
            <Link href="/refund" className="text-[var(--color-accent)] underline">
              Refund Policy
            </Link>
            .
          </p>
        </div>
      </main>

      <footer className="border-t border-[var(--color-border)] px-5 py-6 text-center font-sans text-xs text-[var(--color-ink-muted)]">
        © {new Date().getFullYear()} HandWrought.
      </footer>
    </div>
  );
}
