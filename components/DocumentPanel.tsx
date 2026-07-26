"use client";

import { useEffect, useRef, useState } from "react";
import type { Selection, Suggestion } from "@/lib/types";
import { getCaretCoordinates, getSelectionRects, type Rect } from "@/lib/textareaCaret";
// import { CONTINUE_SENTENCE_INSTRUCTION } from "@/lib/constants"; // continue-sentence feature disabled, collides with Expand
import SelectionToolbar from "./SelectionToolbar";
import FormattingToolbar from "./FormattingToolbar";

type DocumentPanelProps = {
  documentText: string;
  onChangeDocument: (text: string) => void;
  selection: Selection;
  onChangeSelection: (selection: Selection) => void;
  pendingSuggestion: Suggestion | null;
  onEditSuggestionText: (text: string) => void;
  onAccept: () => void;
  onReject: () => void;
  onSelectOption: (index: number) => void;
  onQuickEdit: (text: string) => void;
  isThinking: boolean;
};

const MODE_LABEL: Record<Suggestion["mode"], string> = {
  append: "Proposed addition",
  insert_at_cursor: "Proposed insertion",
  replace_selection: "Proposed replacement",
};

export default function DocumentPanel({
  documentText,
  onChangeDocument,
  selection,
  onChangeSelection,
  pendingSuggestion,
  onEditSuggestionText,
  onAccept,
  onReject,
  onSelectOption,
  onQuickEdit,
  isThinking,
}: DocumentPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasPending = useRef(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0, containerWidth: 0 });
  const [highlightRects, setHighlightRects] = useState<Rect[]>([]);
  const [textareaFocused, setTextareaFocused] = useState(false);

  useEffect(() => {
    if (wasPending.current && !pendingSuggestion) {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(selection.start, selection.end);
      }
    }
    wasPending.current = !!pendingSuggestion;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSuggestion]);

  const ICON_SIZE = 32;
  const CARET_GAP = 10;

  function syncSelectionFromElement(el: HTMLTextAreaElement) {
    onChangeSelection({ start: el.selectionStart, end: el.selectionEnd });
    if (el.selectionEnd > el.selectionStart) {
      const caret = getCaretCoordinates(el, el.selectionEnd);
      setToolbarPos({
        top: caret.top - el.scrollTop,
        left: Math.min(caret.left + CARET_GAP, el.clientWidth - ICON_SIZE),
        containerWidth: el.clientWidth,
      });
      setHighlightRects(
        getSelectionRects(el, el.selectionStart, el.selectionEnd).map((r) => ({
          ...r,
          top: r.top - el.scrollTop,
        }))
      );
    } else {
      setHighlightRects([]);
    }
  }

  function syncSelection(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    syncSelectionFromElement(e.currentTarget);
  }

  function handleFormatted() {
    const el = textareaRef.current;
    if (el) syncSelectionFromElement(el);
  }

  // continue-sentence feature disabled, collides with Expand
  // function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  //   if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
  //   e.preventDefault();
  //   if (isThinking) return;
  //   const el = e.currentTarget;
  //   if (el.selectionStart !== el.selectionEnd) return;
  //   onQuickEdit(CONTINUE_SENTENCE_INSTRUCTION);
  // }

  const hasSelection = selection.end > selection.start;

  return (
    <div className="flex h-full flex-col bg-[var(--color-paper)]">
      <div className="flex items-center justify-between px-10 pt-6 sm:px-16">
        <span className="font-mono text-[11px] tracking-widest text-[var(--color-ink-muted)]">DRAFT.MD</span>
        {/* continue-sentence feature disabled, collides with Expand */}
      </div>

      {!pendingSuggestion && (
        <div className="border-b border-[var(--color-border)] px-10 sm:px-16">
          <FormattingToolbar textareaRef={textareaRef} onFormatted={handleFormatted} />
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto px-10 pb-10 sm:px-16">
        {!pendingSuggestion ? (
          <>
            {hasSelection && !textareaFocused && (
              <div className="pointer-events-none absolute">
                {highlightRects.map((r, i) => (
                  <div
                    key={i}
                    className="absolute bg-[var(--color-accent-tint)]"
                    style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
                  />
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={documentText}
              onChange={(e) => onChangeDocument(e.target.value)}
              onSelect={syncSelection}
              onMouseUp={syncSelection}
              onKeyUp={syncSelection}
              onFocus={() => setTextareaFocused(true)}
              onBlur={() => setTextareaFocused(false)}
              placeholder="Start writing, or ask the assistant for a hand…"
              style={{ fieldSizing: "content" } as React.CSSProperties}
              className="min-h-full w-full resize-none border-none bg-transparent font-serif text-[19px] leading-[1.9] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none"
            />
            {hasSelection && (
              <SelectionToolbar
                top={toolbarPos.top}
                left={toolbarPos.left}
                containerWidth={toolbarPos.containerWidth}
                disabled={isThinking}
                onAction={onQuickEdit}
              />
            )}
          </>
        ) : (
          <div className="w-full font-serif text-[19px] leading-[1.9] text-[var(--color-ink)] whitespace-pre-wrap">
            <span>{documentText.slice(0, pendingSuggestion.rangeStart)}</span>

            <span className="my-2 block rounded-lg border border-[var(--color-accent-tint-border)] bg-[var(--color-accent-tint)] px-4 py-3">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)]">
                {MODE_LABEL[pendingSuggestion.mode]}
                {pendingSuggestion.fellBackToAppend && " · nothing was selected, appended instead"}
              </span>
              <textarea
                value={pendingSuggestion.text}
                onChange={(e) => onEditSuggestionText(e.target.value)}
                className="w-full resize-none border-none bg-transparent font-serif text-[19px] leading-[1.9] text-[var(--color-ink)] focus:outline-none"
                style={{ fieldSizing: "content" } as React.CSSProperties}
                rows={Math.max(2, pendingSuggestion.text.split("\n").length)}
                autoFocus
              />
              {pendingSuggestion.options.length > 1 && (
                <span className="mt-2 flex gap-1.5">
                  {pendingSuggestion.options.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectOption(i)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] transition-colors ${
                        i === pendingSuggestion.optionIndex
                          ? "bg-[var(--color-accent)] text-white"
                          : "border border-[var(--color-accent-tint-border)] text-[var(--color-accent)] hover:bg-[var(--color-paper)]"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </span>
              )}
              <span className="mt-2 flex gap-2">
                <button
                  onClick={onAccept}
                  className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-sans text-xs font-medium text-white hover:bg-[var(--color-accent-hover)]"
                >
                  Accept
                </button>
                <button
                  onClick={onReject}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 font-sans text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-inset)]"
                >
                  Reject
                </button>
              </span>
            </span>

            <span>{documentText.slice(pendingSuggestion.rangeEnd)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
