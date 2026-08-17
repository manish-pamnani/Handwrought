"use client";

import Image from "next/image";
import type { FormEvent } from "react";

type WelcomeOverlayProps = {
  active: boolean;
  topic: string;
  onTopicChange: (value: string) => void;
  onGenerate: () => void;
  creditsRemaining: number;
  lifetimeAccess: boolean;
};

// Passive backdrop (logo/tagline) shown on a blank document, but with a real
// interactive card on top — never a modal to dismiss, just fades away for
// good the moment the editor is focused or a topic is submitted (see the
// `active` prop, owned by the parent as a one-way latch). The outer wrapper
// stays pointer-events-none so clicks pass through to the editor beneath;
// only the card itself (and only while active) is interactive.
export default function WelcomeOverlay({
  active,
  topic,
  onTopicChange,
  onGenerate,
  creditsRemaining,
  lifetimeAccess,
}: WelcomeOverlayProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    onGenerate();
  }

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

      <form
        onSubmit={handleSubmit}
        className={`mt-6 flex w-full max-w-md items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-inset)] p-2 shadow-sm ${
          active ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <input
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          tabIndex={active ? 0 : -1}
          placeholder="e.g. a welcome email for new users"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 font-sans text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!topic.trim()}
          tabIndex={active ? 0 : -1}
          className="shrink-0 rounded-full bg-[var(--color-accent)] px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
        >
          Write it for me →
        </button>
      </form>

      <p
        className={`mt-3 font-mono text-[11px] text-[var(--color-ink-muted)] ${
          active ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {lifetimeAccess
          ? "Unlimited drafts"
          : `${creditsRemaining} free ${creditsRemaining === 1 ? "try" : "tries"} left`}
      </p>
    </div>
  );
}
