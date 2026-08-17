"use client";

import Link from "next/link";
import { useEffect } from "react";

type PaywallModalProps = {
  open: boolean;
  onClose: () => void;
  /** "keep going for free" — switches to the faster, lower-quality model for future generations */
  onContinueFree: () => void;
};

export default function PaywallModal({ open, onClose, onContinueFree }: PaywallModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col items-center gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper)] p-7 text-center shadow-lg"
      >
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-tint)] font-sans text-base text-[var(--color-accent)]">
          ✶
        </div>
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">You&apos;re out of free tries</h2>
        <p className="mt-1 mb-5 font-sans text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
          No pressure — keep writing on the free tier, or upgrade for faster, higher-quality generations whenever
          you&apos;re ready.
        </p>

        <Link
          href="/checkout"
          className="w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-center font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Upgrade to Premium
        </Link>
        <button
          type="button"
          onClick={() => {
            onContinueFree();
            onClose();
          }}
          className="mt-2 w-full rounded-full border border-[var(--color-border)] px-4 py-2.5 font-sans text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
        >
          Continue with free version
        </button>
      </div>
    </div>
  );
}
