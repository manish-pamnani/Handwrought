"use client";

import { useEffect, useState, type RefObject } from "react";

type GuidedAnnotationsProps = {
  active: boolean;
  toolbarRef: RefObject<HTMLDivElement | null>;
  creditsRef: RefObject<HTMLSpanElement | null>;
};

type Point = { top: number; left: number } | null;

const TOOLBAR_ANNOT_WIDTH = 190;
const CREDITS_ANNOT_WIDTH = 180;

// A smooth quadratic-bezier bow with a solid filled arrowhead — mirror
// images of each other so both curve toward their respective real target.
function ToolbarArrow() {
  return (
    <svg width="44" height="60" viewBox="0 0 44 60" fill="none" className="mb-1 text-[var(--color-ink-muted)]">
      <path d="M6 56Q0 28 24 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <polygon points="24,6 20,17 13,9" fill="currentColor" />
    </svg>
  );
}

function CreditsArrow() {
  return (
    <svg width="44" height="60" viewBox="0 0 44 60" fill="none" className="mb-1 ml-auto text-[var(--color-ink-muted)]">
      <path d="M38 56Q44 28 20 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <polygon points="20,6 24,17 31,9" fill="currentColor" />
    </svg>
  );
}

// Small hand-drawn-style nudges toward the real toolbar and the real credits
// counter — positioned off their actual bounding rects (not hardcoded pixel
// offsets), so they stay aligned regardless of viewport size or content.
export default function GuidedAnnotations({ active, toolbarRef, creditsRef }: GuidedAnnotationsProps) {
  const [toolbarPos, setToolbarPos] = useState<Point>(null);
  const [creditsPos, setCreditsPos] = useState<Point>(null);

  useEffect(() => {
    function reposition() {
      const toolbarEl = toolbarRef.current;
      const creditsEl = creditsRef.current;

      if (toolbarEl) {
        // Anchor to the H1 button specifically, not the toolbar row's own
        // (padded) wrapper — its left edge sits well outside the actual
        // buttons, which is what threw the arrow off toward the screen edge.
        const h1Button = toolbarEl.querySelector<HTMLElement>('[title="Heading 1"]');
        const anchorRect = (h1Button ?? toolbarEl).getBoundingClientRect();
        const anchorCenterX = h1Button ? anchorRect.left + anchorRect.width / 2 : anchorRect.left + 40;
        setToolbarPos({ top: anchorRect.bottom + 10, left: anchorCenterX - 24 });
      } else {
        setToolbarPos(null);
      }

      setCreditsPos(
        creditsEl
          ? {
              top: creditsEl.getBoundingClientRect().bottom + 10,
              left: creditsEl.getBoundingClientRect().right - CREDITS_ANNOT_WIDTH,
            }
          : null
      );
    }

    reposition();
    window.addEventListener("resize", reposition);
    document.fonts?.ready?.then(reposition).catch(() => {});
    return () => window.removeEventListener("resize", reposition);
  }, [toolbarRef, creditsRef]);

  return (
    <>
      {toolbarPos && (
        <div
          className={`fixed z-30 hidden font-sans text-[13px] leading-snug text-[var(--color-ink-muted)] transition-opacity duration-500 min-[760px]:block ${
            active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{ top: toolbarPos.top, left: toolbarPos.left, width: TOOLBAR_ANNOT_WIDTH }}
        >
          <ToolbarArrow />
          Format as you write —<br />
          it&apos;s the real toolbar
        </div>
      )}

      {creditsPos && (
        <div
          className={`fixed z-30 hidden text-right font-sans text-[13px] leading-snug text-[var(--color-ink-muted)] transition-opacity duration-500 min-[760px]:block ${
            active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{ top: creditsPos.top, left: creditsPos.left, width: CREDITS_ANNOT_WIDTH }}
        >
          <CreditsArrow />
          Your free tries,
          <br />
          always in view
        </div>
      )}
    </>
  );
}
