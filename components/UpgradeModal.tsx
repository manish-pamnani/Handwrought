"use client";

import Link from "next/link";
import { useEffect } from "react";
import { FREE_GENERATIONS_LIMIT } from "@/lib/constants";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  onContinueDegraded: () => void;
  onOpenSettings: () => void;
};

export default function UpgradeModal({ open, onClose, onContinueDegraded, onOpenSettings }: UpgradeModalProps) {
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
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-6 shadow-lg"
      >
        <div>
          <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">
            You&apos;ve used your {FREE_GENERATIONS_LIMIT} free generations
          </h2>
          <p className="mt-2 font-sans text-[13px] text-[var(--color-ink-muted)]">
            Continue with quicker, lower-quality generations for free, or unlock full quality.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onContinueDegraded();
              onClose();
            }}
            className="w-full rounded-full border border-[var(--color-border)] px-4 py-2.5 font-sans text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
          >
            Continue with lower quality
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Add your own free Gemini key
          </button>
          <Link
            href="/checkout"
            className="w-full rounded-full border border-[var(--color-accent-tint-border)] bg-[var(--color-accent-tint)] px-4 py-2.5 text-center font-sans text-sm font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent-tint)]"
          >
            Get lifetime access — $9.99
          </Link>
        </div>
      </div>
    </div>
  );
}
