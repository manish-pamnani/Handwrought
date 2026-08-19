"use client";

import Image from "next/image";
import Link from "next/link";

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

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-tint)] font-sans text-lg text-[var(--color-accent)]">
          ✶
        </div>
        <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">Lifetime access is coming soon</h1>
        <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
          We&apos;re still finishing up billing for the one-time Lifetime Access purchase — unlimited, full-quality
          generations with no subscription. It&apos;s not ready to buy just yet, but your free credits are still
          yours in the meantime.
        </p>

        <Link
          href="/"
          className="mt-7 w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-center font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Back to HandWrought
        </Link>
      </main>
    </div>
  );
}
