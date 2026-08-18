"use client";

import { useEffect, useState } from "react";

// Original copy, HandWrought's own voice — a small delightful surprise on
// every refresh rather than a flat "Loading…". Picked client-side after
// mount (not during initial render) so server and client agree on the very
// first paint and there's no hydration mismatch.
const MESSAGES = [
  { emoji: "📝", text: "warming up the quill…" },
  { emoji: "☕", text: "brewing your blank page…" },
  { emoji: "🪄", text: "summoning your words…" },
  { emoji: "✍️", text: "un-jamming the pen…" },
  { emoji: "🌱", text: "planting today's first sentence…" },
  { emoji: "🔍", text: "finding your train of thought…" },
  { emoji: "🎩", text: "pulling ideas out of thin air…" },
  { emoji: "🧹", text: "dusting off the draft…" },
  { emoji: "⚡", text: "waking up the editor…" },
  { emoji: "📖", text: "turning to a fresh page…" },
];

export default function RefreshLoader() {
  const [index, setIndex] = useState(0);

  // Math.random() is inherently client-only — picking during render would
  // desync server/client output, so this waits for mount like the other
  // one-time hydration-from-an-external-source effects in this codebase.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setIndex(Math.floor(Math.random() * MESSAGES.length));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const { emoji, text } = MESSAGES[index];

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-paper)]">
      <div className="flex items-center gap-2.5 font-sans text-sm text-[var(--color-ink-muted)]">
        <span className="text-lg" aria-hidden>
          {emoji}
        </span>
        <span>{text}</span>
      </div>
    </div>
  );
}
