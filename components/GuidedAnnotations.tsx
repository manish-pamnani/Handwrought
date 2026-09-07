"use client";

import { useEffect, useState, type RefObject } from "react";

type GuidedAnnotationsProps = {
  active: boolean;
  toolbarRef: RefObject<HTMLDivElement | null>;
  creditsRef: RefObject<HTMLSpanElement | null>;
  helpRef: RefObject<HTMLButtonElement | null>;
};

type Point = { top: number; left: number } | null;

const TOOLBAR_ANNOT_WIDTH = 190;
const CREDITS_ANNOT_WIDTH = 180;
const PASTE_ANNOT_WIDTH = 190;
const HELP_ANNOT_WIDTH = 140;

// A smooth quadratic-bezier bow with a solid filled arrowhead — mirror
// images of each other so both curve toward their respective real target.
function ToolbarArrow() {
  return (
    <svg width="44" height="60" viewBox="0 0 44 60" fill="none" className="mb-1 ml-auto text-[var(--color-ink-muted)]">
      <path d="M38 56Q44 28 20 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <polygon points="20,6 24,17 31,9" fill="currentColor" />
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

function PasteArrow() {
  return (
    <svg width="44" height="60" viewBox="0 0 44 60" fill="none" className="mb-1 text-[var(--color-ink-muted)]">
      <path d="M6 56Q0 28 24 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <polygon points="24,6 20,17 13,9" fill="currentColor" />
    </svg>
  );
}

// Same bow as ToolbarArrow, mirrored vertically — the label sits above the
// help button (bottom-right corner) rather than below a top-of-page target,
// so the curve needs to sweep downward into it instead of up.
function HelpArrow() {
  return (
    <svg width="44" height="60" viewBox="0 0 44 60" fill="none" className="mt-1 ml-auto text-[var(--color-ink-muted)]">
      <path d="M38 4Q44 32 20 54" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <polygon points="20,54 24,43 31,51" fill="currentColor" />
    </svg>
  );
}

// Small hand-drawn-style nudges toward the real toolbar and the real credits
// counter — positioned off their actual bounding rects (not hardcoded pixel
// offsets), so they stay aligned regardless of viewport size or content.
export default function GuidedAnnotations({ active, toolbarRef, creditsRef, helpRef }: GuidedAnnotationsProps) {
  const [toolbarPos, setToolbarPos] = useState<Point>(null);
  const [creditsPos, setCreditsPos] = useState<Point>(null);
  const [pastePos, setPastePos] = useState<Point>(null);
  const [helpPos, setHelpPos] = useState<Point>(null);

  useEffect(() => {
    function reposition() {
      const toolbarEl = toolbarRef.current;
      const creditsEl = creditsRef.current;

      if (toolbarEl) {
        // Both anchored to the toolbar's own real buttons — the row div
        // itself stretches to the full page width (mostly empty space past
        // the last button), so anchoring to *it* was pointing at the page
        // edge, not the toolbar edge. Bold is the toolbar's actual leftmost
        // button, Redo its actual rightmost, both always rendered.
        const boldButton = toolbarEl.querySelector<HTMLElement>('[title="Bold"]');
        const redoButton = toolbarEl.querySelector<HTMLElement>('[title="Redo"]');
        const leftAnchor = (boldButton ?? toolbarEl).getBoundingClientRect();
        const rightAnchor = (redoButton ?? toolbarEl).getBoundingClientRect();

        // The top-left spot right below the toolbar is where users
        // naturally click first to start writing — that's the paste
        // callout's spot now, not the toolbar callout's. The toolbar
        // callout points up into the toolbar's right edge instead, so it's
        // never competing for that prime first-click real estate.
        setPastePos({ top: leftAnchor.bottom + 30, left: leftAnchor.left });
        setToolbarPos({ top: rightAnchor.bottom + 10, left: rightAnchor.right - TOOLBAR_ANNOT_WIDTH });
      } else {
        setToolbarPos(null);
        setPastePos(null);
      }

      setCreditsPos(
        creditsEl
          ? {
              top: creditsEl.getBoundingClientRect().bottom + 10,
              left: creditsEl.getBoundingClientRect().right - CREDITS_ANNOT_WIDTH,
            }
          : null
      );

      const helpEl = helpRef.current;
      setHelpPos(
        helpEl
          ? {
              // Button sits fixed to the viewport corner, so the label goes
              // above it (not below, like the top-of-page targets) — arrow
              // curves down into the button from there.
              top: helpEl.getBoundingClientRect().top - 96,
              left: helpEl.getBoundingClientRect().right - HELP_ANNOT_WIDTH,
            }
          : null
      );
    }

    reposition();
    window.addEventListener("resize", reposition);
    document.fonts?.ready?.then(reposition).catch(() => {});
    return () => window.removeEventListener("resize", reposition);
  }, [toolbarRef, creditsRef, helpRef]);

  return (
    <>
      {/* {toolbarPos && (
        <div
          className={`fixed z-30 hidden text-right font-sans text-[13px] leading-snug text-[var(--color-ink-muted)] transition-opacity duration-500 min-[760px]:block ${
            active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{ top: toolbarPos.top, left: toolbarPos.left, width: TOOLBAR_ANNOT_WIDTH }}
        >
          <ToolbarArrow />
          Format as you write —<br />
          it&apos;s the real toolbar
        </div>
      )} */}

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

      {pastePos && (
        <div
          className={`fixed z-30 hidden font-sans text-[13px] leading-snug text-[var(--color-ink-muted)] transition-opacity duration-500 min-[760px]:block ${
            active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{ top: pastePos.top, left: pastePos.left, width: PASTE_ANNOT_WIDTH }}
        >
          <PasteArrow />
          Paste a draft
          <br />
          you already have
        </div>
      )}

      {helpPos && (
        <div
          className={`fixed z-30 hidden text-right font-sans text-[13px] leading-snug text-[var(--color-ink-muted)] transition-opacity duration-500 min-[760px]:block ${
            active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{ top: helpPos.top, left: helpPos.left, width: HELP_ANNOT_WIDTH }}
        >
          Shortcuts &<br />
          help
          <HelpArrow />
        </div>
      )}
    </>
  );
}
