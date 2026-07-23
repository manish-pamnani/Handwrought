"use client";

import { useEffect, useRef, useState } from "react";
import { TONES } from "@/lib/constants";

type SelectionToolbarProps = {
  top: number;
  left: number;
  containerWidth: number;
  disabled: boolean;
  onAction: (instruction: string) => void;
};

const ICON_SIZE = 32;
const POPUP_WIDTH = 256; // matches w-64
const EDGE_MARGIN = 8;

const QUICK_ACTIONS = [
  {
    label: "Find Synonyms",
    instruction:
      "Suggest up to 3 synonyms for the selected word or phrase that fit naturally in this context, keeping the same part of speech and meaning. Offer each as a separate alternative replacement.",
  },
  { label: "Improve/Rephrase", instruction: "Improve and rephrase the selected text, keeping the same meaning." },
  { label: "Shorten", instruction: "Make the selected text more concise without losing the key meaning." },
  { label: "Expand", instruction: "Expand the selected text with more detail." },
  { label: "Fix Grammar", instruction: "Fix any grammar and spelling mistakes in the selected text." },
];

export default function SelectionToolbar({ top, left, containerWidth, disabled, onAction }: SelectionToolbarProps) {
  const [open, setOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [freeform, setFreeform] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setToneOpen(false);
    setFreeform("");
  }

  function act(instruction: string) {
    onAction(instruction);
    close();
  }

  function handleFreeformKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && freeform.trim()) {
      act(freeform.trim());
    }
  }

  // Popup's desired position (container-relative), clamped so it can't run
  // past either edge of the document panel, then converted to be relative
  // to the wrapper div (which itself sits at `left`).
  const popupDesiredLeft = left + ICON_SIZE / 2 - POPUP_WIDTH / 2;
  const popupClampedLeft = Math.min(
    Math.max(popupDesiredLeft, EDGE_MARGIN),
    containerWidth - POPUP_WIDTH - EDGE_MARGIN
  );
  const popupOffset = popupClampedLeft - left;

  return (
    <div ref={wrapperRef} className="absolute" style={{ top, left }}>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-label="Quick edit"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-md transition-transform hover:scale-[1.05] disabled:opacity-40"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1.5 9.8 5.9l4.7 1.8-4.7 1.8L8 14.3 6.2 9.5 1.5 7.7l4.7-1.8L8 1.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-9 z-10 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-1.5 shadow-lg"
          style={{ left: popupOffset }}
        >
          <input
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            onKeyDown={handleFreeformKeyDown}
            placeholder="Tell it what to do…"
            className="mb-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-inset)] px-2.5 py-1.5 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]"
          />

          <div className="relative">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setToneOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left font-sans text-[13px] text-[var(--color-ink)] hover:bg-[var(--color-paper-inset)]"
            >
              Change Tone
              <span className="text-[var(--color-ink-muted)]">{toneOpen ? "‹" : "›"}</span>
            </button>
            {toneOpen && (
              <div className="ml-2 mt-0.5 space-y-0.5 border-l border-[var(--color-border)] pl-2">
                {TONES.map((tone) => (
                  <button
                    key={tone}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => act(`Rewrite the selected text in a ${tone.toLowerCase()} tone.`)}
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left font-sans text-[13px] text-[var(--color-ink)] hover:bg-[var(--color-paper-inset)]"
                  >
                    {tone}
                  </button>
                ))}
              </div>
            )}
          </div>

          {QUICK_ACTIONS.map(({ label, instruction }) => (
            <button
              key={label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => act(instruction)}
              className="block w-full rounded-lg px-2.5 py-1.5 text-left font-sans text-[13px] text-[var(--color-ink)] hover:bg-[var(--color-paper-inset)]"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
