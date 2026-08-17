"use client";

import { useEffect } from "react";

type PaywallModalProps = {
  open: boolean;
  onClose: () => void;
  onSignUp: () => void;
};

export default function PaywallModal({ open, onClose, onSignUp }: PaywallModalProps) {
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
          Sign up to keep going — outlines, rewrites, and every quick edit, right where you&apos;re writing.
        </p>

        <button
          type="button"
          onClick={onSignUp}
          className="w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Sign up to keep writing
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-full px-4 py-2.5 font-sans text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-paper-inset)]"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
