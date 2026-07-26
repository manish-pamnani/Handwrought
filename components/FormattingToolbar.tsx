"use client";

import type { RefObject } from "react";
import {
  insertImage,
  insertLink,
  redoEdit,
  toggleAlign,
  toggleBulletList,
  toggleHeading,
  toggleNumberedList,
  toggleQuote,
  undoEdit,
  wrapSelection,
  type Align,
} from "@/lib/textareaFormatting";

type FormattingToolbarProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onFormatted: () => void;
};

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-[var(--color-border)]" />;
}

type ButtonProps = {
  title: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
};

function ToolbarButton({ title, onClick, className = "", children }: ButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)] active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}

export default function FormattingToolbar({ textareaRef, onFormatted }: FormattingToolbarProps) {
  function run(action: (el: HTMLTextAreaElement) => void) {
    const el = textareaRef.current;
    if (!el) return;
    action(el);
    onFormatted();
  }

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto py-1">
      <ToolbarButton title="Bold" className="font-sans text-[13px] font-bold" onClick={() => run((el) => wrapSelection(el, "**", "**", "bold text"))}>
        B
      </ToolbarButton>
      <ToolbarButton title="Italic" className="font-sans text-[13px] italic" onClick={() => run((el) => wrapSelection(el, "*", "*", "italic text"))}>
        I
      </ToolbarButton>
      <ToolbarButton title="Underline" className="font-sans text-[13px] underline" onClick={() => run((el) => wrapSelection(el, "<u>", "</u>", "underlined text"))}>
        U
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" className="font-sans text-[13px] line-through" onClick={() => run((el) => wrapSelection(el, "~~", "~~", "struck text"))}>
        S
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Heading 1" className="font-mono text-[11px] font-semibold" onClick={() => run((el) => toggleHeading(el, 1))}>
        H1
      </ToolbarButton>
      <ToolbarButton title="Heading 2" className="font-mono text-[11px] font-semibold" onClick={() => run((el) => toggleHeading(el, 2))}>
        H2
      </ToolbarButton>
      <ToolbarButton title="Heading 3" className="font-mono text-[11px] font-semibold" onClick={() => run((el) => toggleHeading(el, 3))}>
        H3
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Bulleted list" onClick={() => run(toggleBulletList)}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="2" cy="4" r="1" fill="currentColor" />
          <circle cx="2" cy="8" r="1" fill="currentColor" />
          <circle cx="2" cy="12" r="1" fill="currentColor" />
          <line x1="5.5" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="5.5" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="5.5" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </ToolbarButton>
      <ToolbarButton title="Numbered list" onClick={() => run(toggleNumberedList)}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <text x="0" y="5.2" fontSize="4.6" fill="currentColor" fontFamily="var(--font-mono), monospace">
            1
          </text>
          <text x="0" y="9.2" fontSize="4.6" fill="currentColor" fontFamily="var(--font-mono), monospace">
            2
          </text>
          <text x="0" y="13.2" fontSize="4.6" fill="currentColor" fontFamily="var(--font-mono), monospace">
            3
          </text>
          <line x1="5.5" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="5.5" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="5.5" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Link" onClick={() => run(insertLink)}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M6.5 9.5 9.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path
            d="M8 4.2 9.3 2.9a2.4 2.4 0 0 1 3.4 3.4L11.3 7.6"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M8 11.8 6.7 13.1a2.4 2.4 0 0 1-3.4-3.4L4.7 8.4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </ToolbarButton>
      <ToolbarButton title="Image" onClick={() => run(insertImage)}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="5.2" cy="6.2" r="1.1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 11.5 5.5 8l2.5 2.5 2-2 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        </svg>
      </ToolbarButton>
      <ToolbarButton title="Quote" onClick={() => run(toggleQuote)}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 6.3c0-1.3 1-2.2 2.2-2.2M3 6.3v2.9c0 .7.6 1.3 1.3 1.3h.4c.7 0 1.3-.6 1.3-1.3V8.1c0-.7-.6-1.3-1.3-1.3H4"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M9.5 6.3c0-1.3 1-2.2 2.2-2.2M9.5 6.3v2.9c0 .7.6 1.3 1.3 1.3h.4c.7 0 1.3-.6 1.3-1.3V8.1c0-.7-.6-1.3-1.3-1.3h-.4"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </ToolbarButton>
      <ToolbarButton title="Highlight" onClick={() => run((el) => wrapSelection(el, "==", "==", "highlighted text"))}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M10.5 2.5 13.5 5.5 6 13H3v-3L10.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
          <path d="M9 4 12 7" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </ToolbarButton>

      <Divider />

      {(["left", "center", "right"] as Align[]).map((align) => (
        <ToolbarButton key={align} title={`Align ${align}`} onClick={() => run((el) => toggleAlign(el, align))}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            {align === "left" && (
              <>
                <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="2" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </>
            )}
            {align === "center" && (
              <>
                <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="3" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </>
            )}
            {align === "right" && (
              <>
                <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="6" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="4" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </>
            )}
          </svg>
        </ToolbarButton>
      ))}

      <Divider />

      <ToolbarButton title="Undo" onClick={() => run(undoEdit)}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 7h6.5a3 3 0 0 1 0 6H8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path d="M6.5 4 4 7l2.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </ToolbarButton>
      <ToolbarButton title="Redo" onClick={() => run(redoEdit)}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 7H5.5a3 3 0 0 0 0 6H8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path d="M9.5 4 12 7l-2.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </ToolbarButton>
    </div>
  );
}
