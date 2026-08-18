"use client";

import { useEffect, useState, type FormEvent, type RefObject } from "react";

type Rect = { top: number; left: number; width: number; height: number };

type DocumentComposerProps = {
  /** false while centered in the welcome card, true once docked in the header */
  docked: boolean;
  centerSlotRef: RefObject<HTMLDivElement | null>;
  headerSlotRef: RefObject<HTMLDivElement | null>;
  topic: string;
  onTopicChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  error: string | null;
};

// Position/size glide — the "flies from center to header" part.
const DOCK_TRANSITION =
  "top 750ms cubic-bezier(0.16, 1, 0.3, 1), left 750ms cubic-bezier(0.16, 1, 0.3, 1), " +
  "width 750ms cubic-bezier(0.16, 1, 0.3, 1), height 750ms cubic-bezier(0.16, 1, 0.3, 1)";

// Only shown once the pill has docked — examples of the whole-document
// instructions it now accepts, rotating so it keeps advertising that
// capability instead of going stale as one static hint.
const ROLLING_PLACEHOLDERS = [
  "Fix grammar throughout the document…",
  "Rewrite this in a friendlier tone…",
  "Shorten the whole document…",
  "Translate this to Hindi…",
  "Remove all the em dashes…",
  "Make this sound more persuasive…",
];
const ROLL_INTERVAL_MS = 2400;

// The one pill that starts centered in the welcome card and docks into the
// header's middle slot once onboarding latches — never two separate
// instances. It stays mounted at the page level (not inside DocumentPanel or
// TopBar) and is positioned with `fixed`, tracking whichever placeholder
// slot (centerSlotRef or headerSlotRef) is currently "home". Docking is a
// pure CSS transition on top/left/width/height — no manual FLIP bookkeeping
// needed since we never reparent real DOM, we just retarget which rect we
// track and let the browser interpolate.
export default function DocumentComposer({
  docked,
  centerSlotRef,
  headerSlotRef,
  topic,
  onTopicChange,
  onSubmit,
  disabled,
  error,
}: DocumentComposerProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [focused, setFocused] = useState(false);
  const [rollIndex, setRollIndex] = useState(0);

  // The rolling overlay only makes sense once docked, the field is actually
  // empty, and nothing else (focus, typing, a request in flight) already
  // wants that space — otherwise it has no business being on screen at all,
  // per requirement 3 (instant hide on focus/typing).
  const showRollingPlaceholder = docked && !focused && !topic.trim() && !disabled;

  useEffect(() => {
    if (!showRollingPlaceholder) return;
    const id = setInterval(() => {
      setRollIndex((i) => (i + 1) % ROLLING_PLACEHOLDERS.length);
    }, ROLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [showRollingPlaceholder]);

  useEffect(() => {
    function measure() {
      const slot = docked ? headerSlotRef.current : centerSlotRef.current;
      if (!slot) return;
      const r = slot.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready?.then(measure).catch(() => {});

    const slots = [centerSlotRef.current, headerSlotRef.current].filter(
      (el): el is HTMLDivElement => !!el
    );
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    slots.forEach((el) => ro?.observe(el));

    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [docked, centerSlotRef, headerSlotRef]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!topic.trim() || disabled) return;
    onSubmit();
  }

  if (!rect) return null;

  return (
    <div
      className="fixed z-40 flex items-center justify-center"
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, transition: DOCK_TRANSITION }}
    >
      <form
        onSubmit={handleSubmit}
        className={`flex w-full items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-inset)] shadow-sm transition-all duration-[420ms] ${
          docked ? "p-1" : "p-2"
        }`}
      >
        <div className="relative min-w-0 flex-1">
          <input
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            aria-label="Instruction for the whole document"
            // Static fallback placeholder for screen readers (via aria-label,
            // always present) and sighted users the instant the rolling
            // overlay is hidden (focus/typing) — blanked out only while the
            // overlay itself is showing, so the two never render on top of
            // each other.
            placeholder={
              showRollingPlaceholder ? "" : disabled ? "Thinking…" : docked ? "Ask for an edit…" : "What are we writing today?"
            }
            className={`w-full min-w-0 bg-transparent font-sans text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none disabled:opacity-60 transition-all duration-[420ms] ${
              docked ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
            }`}
          />

          {showRollingPlaceholder && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-2"
            >
              <span key={rollIndex} className="animate-composer-roll-in truncate text-xs text-[var(--color-ink-muted)]">
                {ROLLING_PLACEHOLDERS[rollIndex]}
              </span>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!topic.trim() || disabled}
          className={`shrink-0 rounded-full bg-[var(--color-accent)] font-sans font-semibold whitespace-nowrap text-white transition-all duration-[420ms] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 ${
            docked ? "px-2.5 py-1 text-[11px]" : "px-4 py-2 text-sm"
          }`}
        >
          {docked ? "Write for me →" : "Write it for me →"}
        </button>
      </form>

      {error && (
        <p className="absolute top-full mt-1 whitespace-nowrap font-mono text-[10px] text-red-600">{error}</p>
      )}
    </div>
  );
}
