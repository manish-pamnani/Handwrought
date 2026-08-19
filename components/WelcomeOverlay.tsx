"use client";

import Image from "next/image";
import type { RefObject } from "react";

type WelcomeOverlayProps = {
  active: boolean;
  creditsRemaining: number;
  lifetimeAccess: boolean;
  /** lets DocumentComposer measure where its pill starts before it docks into the header */
  centerSlotRef: RefObject<HTMLDivElement | null>;
  /** fires the same one-shot onboarding outline the composer's own submit does, with a canned topic */
  onSelectExample: (topic: string) => void;
  /** opens ImportModal — the alternate "bring your own doc" entry point */
  onOpenImport: () => void;
};

// Landing-page-only shortcuts: skip typing entirely and kick off the same
// outline generation with a canned topic. Picked to show the range of
// documents this can draft, not just "articles" — a PRD, a blog post, and a
// love letter (the fun one) all read fine through buildArticleInstruction's
// title/sections/conclusion shape.
const EXAMPLE_PROMPTS = [
  { label: "PRD for a SaaS product", topic: "a PRD for a production-ready writing assistant SaaS" },
  { label: "Startup blog post", topic: "why every early-stage startup should build in public" },
  { label: "A love letter", topic: "a heartfelt love letter to someone special" },
];

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
export default function WelcomeOverlay({
  active,
  creditsRemaining,
  lifetimeAccess,
  centerSlotRef,
  onSelectExample,
  onOpenImport,
}: WelcomeOverlayProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Image src="/handwrought-icon.svg" alt="" width={30} height={30} />
        <span className="font-serif text-2xl font-semibold tracking-tight text-[var(--color-accent)]">
          HandWrought
        </span>
      </div>
      <p className="mt-4 max-w-xs font-sans text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Give it a topic — get a full draft to work from, right in the editor.
      </p>

      <div ref={centerSlotRef} className="mt-6 h-14 w-full max-w-md" />

      {/* pointer-events-auto punches through the overlay's own
          pointer-events-none so these stay clickable */}
      <div className="pointer-events-auto mt-3 flex flex-wrap items-center justify-center gap-2">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => onSelectExample(example.topic)}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 font-sans text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]"
          >
            {example.label}
          </button>
        ))}
      </div>

      <div className="pointer-events-auto mt-4 flex items-center gap-1.5 font-sans text-xs text-[var(--color-ink-muted)]">
        <span>or</span>
        <button
          type="button"
          onClick={onOpenImport}
          className="font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/40 underline-offset-2 transition-colors hover:text-[var(--color-accent-hover)] hover:decoration-[var(--color-accent-hover)]"
        >
          import a document
        </button>
      </div>

      <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-muted)]">
        {lifetimeAccess
          ? "Unlimited drafts"
          : `${creditsRemaining} free ${creditsRemaining === 1 ? "try" : "tries"} left`}
      </p>
    </div>
  );
}
