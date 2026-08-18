"use client";

import Image from "next/image";
import type { RefObject } from "react";

type WelcomeOverlayProps = {
  active: boolean;
  creditsRemaining: number;
  lifetimeAccess: boolean;
  /** lets DocumentComposer measure where its pill starts before it docks into the header */
  centerSlotRef: RefObject<HTMLDivElement | null>;
};

// Passive backdrop (logo/tagline) shown on a blank document — never a modal
// to dismiss, just fades away for good the moment the editor is focused or a
// topic is submitted (see the `active` prop, owned by the parent as a
// one-way latch). The outer wrapper stays pointer-events-none so clicks pass
// through to the editor beneath.
//
// The topic input + submit button used to live here too, but they're now
// DocumentComposer — a single pill that's always mounted at the page level
// and docks into the header once onboarding finishes. `centerSlotRef` below
// is just an empty, correctly-sized placeholder so that pill has a real rect
// to measure and animate away from while it's still "here".
export default function WelcomeOverlay({ active, creditsRemaining, lifetimeAccess, centerSlotRef }: WelcomeOverlayProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Image src="/handwrought-icon.svg" alt="" width={30} height={30} />
        <span className="font-serif text-2xl font-semibold tracking-tight text-[var(--color-accent)]">
          handwrought
        </span>
      </div>
      <p className="mt-4 max-w-xs font-sans text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Give it a topic — get a full draft to work from, right in the editor.
      </p>

      <div ref={centerSlotRef} className="mt-6 h-14 w-full max-w-md" />

      <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-muted)]">
        {lifetimeAccess
          ? "Unlimited drafts"
          : `${creditsRemaining} free ${creditsRemaining === 1 ? "try" : "tries"} left`}
      </p>
    </div>
  );
}
