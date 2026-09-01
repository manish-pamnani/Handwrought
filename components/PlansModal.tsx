"use client";

import { useEffect } from "react";
import type { Tier } from "@/lib/constants";
import PlansPanel from "./PlansPanel";

type PlansModalProps = {
  open: boolean;
  onClose: () => void;
  userEmail: string | null | undefined;
  userUid: string;
  currentTier: Tier | null;
  /** called once a purchase completes, so the caller can refresh its own credits/tier display */
  onPurchaseComplete?: () => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

export default function PlansModal({ open, onClose, userEmail, userUid, currentTier, onPurchaseComplete }: PlansModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper)] shadow-lg"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-paper-inset)] hover:text-[var(--color-ink)]"
        >
          <CloseIcon />
        </button>

        <div className="px-6 py-8 sm:px-8">
          <PlansPanel
            userEmail={userEmail}
            userUid={userUid}
            currentTier={currentTier}
            onPurchaseComplete={onPurchaseComplete}
            onDone={onClose}
            doneLabel="Done"
            header={
              <div className="text-center">
                <h2 className="font-serif text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
                  Plans that grow with your writing
                </h2>
                <p className="mx-auto mt-1.5 max-w-md font-sans text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
                  A one-time payment, not a subscription — buy a credit pack and use it whenever you like. Credits
                  never expire; buy another pack anytime you run low.
                </p>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
