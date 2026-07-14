"use client";

import { useEffect, useRef } from "react";
import type { Selection, Suggestion } from "@/lib/types";

type DocumentPanelProps = {
  documentText: string;
  onChangeDocument: (text: string) => void;
  selection: Selection;
  onChangeSelection: (selection: Selection) => void;
  pendingSuggestion: Suggestion | null;
  onEditSuggestionText: (text: string) => void;
  onAccept: () => void;
  onReject: () => void;
  onAskAI: () => void;
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
  onAskAI,
}: DocumentPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasPending = useRef(false);

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

  function syncSelection(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    onChangeSelection({ start: el.selectionStart, end: el.selectionEnd });
  }

  const hasSelection = selection.end > selection.start;

  return (
    <div className="flex h-full flex-col bg-[var(--color-paper)]">
      <div className="px-10 pt-6 sm:px-16">
        <span className="font-mono text-[11px] tracking-widest text-[var(--color-ink-muted)]">DRAFT.MD</span>
      </div>

      <div className="relative flex-1 overflow-y-auto px-10 pb-10 sm:px-16">
        {!pendingSuggestion ? (
          <>
            <textarea
              ref={textareaRef}
              value={documentText}
              onChange={(e) => onChangeDocument(e.target.value)}
              onSelect={syncSelection}
              onMouseUp={syncSelection}
              onKeyUp={syncSelection}
              placeholder="Start writing, or ask the assistant for a hand…"
              className="min-h-full w-full resize-none border-none bg-transparent font-serif text-[19px] leading-[1.9] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none"
            />
            {hasSelection && (
              <button
                onClick={onAskAI}
                className="absolute bottom-6 right-6 rounded-full bg-[var(--color-accent)] px-4 py-2 font-sans text-xs font-medium text-white shadow-md transition-transform hover:scale-[1.03]"
              >
                Ask AI about this
              </button>
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
