"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type RefObject } from "react";
import { EditorContent, useEditor, generateHTML, type Editor } from "@tiptap/react";
import { findTable, TableMap } from "@tiptap/pm/tables";
import { TextSelection } from "@tiptap/pm/state";
import { EDITOR_EXTENSIONS, getMarkdown } from "@/lib/richTextExtensions";
import type { Suggestion } from "@/lib/types";
import SelectionToolbar from "./SelectionToolbar";
import FormattingToolbar from "./FormattingToolbar";
import WelcomeOverlay from "./WelcomeOverlay";

/** Moves the selection into the table's last cell (for row) or last cell of
 *  its first row (for column), then runs the corresponding add command — so
 *  the "+" affordances on the table edges always append at the true end,
 *  regardless of where the cursor currently sits inside the table. */
function appendTableRowOrColumn(editor: Editor, kind: "row" | "column") {
  const table = findTable(editor.state.selection.$from);
  if (!table) return;
  const map = TableMap.get(table.node);
  const cellIndex = kind === "row" ? map.map[map.width * (map.height - 1) + (map.width - 1)] : map.map[map.width - 1];
  const pos = table.start + cellIndex + 1;
  const resolved = editor.state.doc.resolve(Math.min(pos, editor.state.doc.content.size));
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(resolved)));
  if (kind === "row") {
    editor.chain().focus().addRowAfter().run();
  } else {
    editor.chain().focus().addColumnAfter().run();
  }
}

export type DocumentPanelHandle = {
  getEditor: () => Editor | null;
};

type DocumentPanelProps = {
  documentText: string;
  onChangeDocument: (text: string) => void;
  pendingSuggestion: Suggestion | null;
  onEditSuggestionText: (text: string) => void;
  onAccept: () => void;
  onReject: () => void;
  onSelectOption: (index: number) => void;
  /** resolves true on success, false on failure — see SelectionToolbar's per-item "Thinking…" state */
  onQuickEdit: (text: string) => Promise<boolean>;
  isThinking: boolean;
  /** fires once, the first time the user presses Enter on an empty document with a typed topic */
  onOutlineEnter: (topic: string) => void;
  /** whether the passive welcome state (logo/tagline) should still be showing */
  showWelcome: boolean;
  /** fires on the editor's first focus — the signal that latches showWelcome off for good */
  onEditorFocus?: () => void;
  /** drives the brief "drafting an outline…" status line for the Enter-to-outline flow */
  outlineStatus?: "idle" | "drafting" | "error";
  /** lets GuidedAnnotations measure the real toolbar row to point its arrow at */
  toolbarRowRef?: RefObject<HTMLDivElement | null>;
  /** for the welcome card's "N free outlines left" line */
  creditsRemaining: number;
  lifetimeAccess: boolean;
  /** lets DocumentComposer measure where its pill starts before it docks into the header */
  centerSlotRef: RefObject<HTMLDivElement | null>;
  /** shared one-shot guard with DocumentComposer so onboarding can't fire twice (Enter-in-editor vs. the composer's own submit) */
  outlineFiredRef: RefObject<boolean>;
};

type Rect = { top: number; left: number; width: number; height: number };

const MODE_LABEL: Record<Suggestion["mode"], string> = {
  append: "Proposed addition",
  insert_at_cursor: "Proposed insertion",
  replace_selection: "Proposed replacement",
};

const ICON_SIZE = 32;
const CARET_GAP = 10;

const DocumentPanel = forwardRef<DocumentPanelHandle, DocumentPanelProps>(function DocumentPanel(
  {
    documentText,
    onChangeDocument,
    pendingSuggestion,
    onEditSuggestionText,
    onAccept,
    onReject,
    onSelectOption,
    onQuickEdit,
    isThinking,
    onOutlineEnter,
    showWelcome,
    onEditorFocus,
    toolbarRowRef,
    outlineStatus = "idle",
    creditsRemaining,
    lifetimeAccess,
    centerSlotRef,
    outlineFiredRef,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(documentText);
  // Tiptap only wires up `editorProps.handleKeyDown` once, at editor creation
  // — mirror the latest pendingSuggestion/onOutlineEnter into refs so that
  // handler always reads current values instead of a stale first-render closure.
  const pendingSuggestionRef = useRef(pendingSuggestion);
  const onOutlineEnterRef = useRef(onOutlineEnter);
  useEffect(() => {
    pendingSuggestionRef.current = pendingSuggestion;
    onOutlineEnterRef.current = onOutlineEnter;
  }, [pendingSuggestion, onOutlineEnter]);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0, containerWidth: 0 });
  const [highlightRects, setHighlightRects] = useState<Rect[]>([]);
  const [hasSelection, setHasSelection] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [tableRect, setTableRect] = useState<Rect | null>(null);

  function syncSelection(editor: Editor) {
    const container = containerRef.current;
    if (!container) return;
    const { from, to } = editor.state.selection;
    const containerRect = container.getBoundingClientRect();

    if (editor.isActive("table")) {
      const table = findTable(editor.state.selection.$from);
      const dom = table ? (editor.view.nodeDOM(table.pos) as HTMLElement | null) : null;
      if (dom) {
        const r = dom.getBoundingClientRect();
        setTableRect({
          top: r.top - containerRect.top + container.scrollTop,
          left: r.left - containerRect.left + container.scrollLeft,
          width: r.width,
          height: r.height,
        });
      } else {
        setTableRect(null);
      }
    } else {
      setTableRect(null);
    }

    if (to > from) {
      setHasSelection(true);
      const coords = editor.view.coordsAtPos(to);
      setToolbarPos({
        top: coords.top - containerRect.top + container.scrollTop,
        left: Math.min(
          coords.left - containerRect.left + container.scrollLeft + CARET_GAP,
          container.clientWidth - ICON_SIZE
        ),
        containerWidth: container.clientWidth,
      });

      try {
        const start = editor.view.domAtPos(from);
        const end = editor.view.domAtPos(to);
        const range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        setHighlightRects(
          Array.from(range.getClientRects()).map((r) => ({
            top: r.top - containerRect.top + container.scrollTop,
            left: r.left - containerRect.left + container.scrollLeft,
            width: r.width,
            height: r.height,
          }))
        );
      } catch {
        setHighlightRects([]);
      }
    } else {
      setHasSelection(false);
      setHighlightRects([]);
    }
  }

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: documentText,
    editable: !pendingSuggestion,
    immediatelyRender: false,
    editorProps: {
      handleKeyDown(view, event) {
        if (event.key !== "Enter" || event.shiftKey) return false;
        if (outlineFiredRef.current || pendingSuggestionRef.current) return false;
        const topic = view.state.doc.textContent.trim();
        if (!topic) return false;
        event.preventDefault();
        outlineFiredRef.current = true;
        view.dispatch(view.state.tr.delete(0, view.state.doc.content.size));
        onOutlineEnterRef.current(topic);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = getMarkdown(editor);
      lastEmitted.current = markdown;
      onChangeDocument(markdown);
    },
    onSelectionUpdate: ({ editor }) => syncSelection(editor),
    onFocus: () => {
      setEditorFocused(true);
      onEditorFocus?.();
    },
    onBlur: () => setEditorFocused(false),
  });

  useImperativeHandle(ref, () => ({ getEditor: () => editor }), [editor]);

  // Sync external document changes (initial hydration from localStorage) into
  // the editor — but never re-parse markdown back in after our own onUpdate,
  // which would reset the caret and drop any formatting markdown can't
  // represent (e.g. alignment) mid-edit.
  useEffect(() => {
    if (!editor || documentText === lastEmitted.current) return;
    lastEmitted.current = documentText;
    editor.commands.setContent(documentText);
  }, [documentText, editor]);

  useEffect(() => {
    editor?.setEditable(!pendingSuggestion);
  }, [pendingSuggestion, editor]);

  function handleAccept() {
    if (!editor || !pendingSuggestion) return;
    const docSize = editor.state.doc.content.size;
    const from = Math.min(pendingSuggestion.rangeStart, docSize);
    const to = Math.min(pendingSuggestion.rangeEnd, docSize);
    editor
      .chain()
      .insertContentAt({ from, to }, pendingSuggestion.text)
      .focus()
      .run();
    onAccept();
  }

  function handleReject() {
    onReject();
    editor?.chain().focus().run();
  }

  let beforeHtml = "";
  let afterHtml = "";
  if (editor && pendingSuggestion) {
    const docSize = editor.state.doc.content.size;
    const rangeStart = Math.min(pendingSuggestion.rangeStart, docSize);
    const rangeEnd = Math.min(pendingSuggestion.rangeEnd, docSize);
    const beforeSlice = editor.state.doc.slice(0, rangeStart);
    const afterSlice = editor.state.doc.slice(rangeEnd, docSize);
    beforeHtml = generateHTML({ type: "doc", content: beforeSlice.content.toJSON() ?? [] }, EDITOR_EXTENSIONS);
    afterHtml = generateHTML({ type: "doc", content: afterSlice.content.toJSON() ?? [] }, EDITOR_EXTENSIONS);
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-paper)]">
      <div className="flex items-center justify-between px-10 pt-6 sm:px-16">
        <span className="font-mono text-[11px] tracking-widest text-[var(--color-ink-muted)]">DRAFT.MD</span>
      </div>

      {!pendingSuggestion && (
        <div ref={toolbarRowRef} className="border-b border-[var(--color-border)] px-10 sm:px-16">
          <FormattingToolbar editor={editor} />
        </div>
      )}

      <div ref={containerRef} className="relative flex-1 overflow-y-auto px-10 pb-10 sm:px-16">
        {!pendingSuggestion && (
          <WelcomeOverlay
            active={showWelcome}
            creditsRemaining={creditsRemaining}
            lifetimeAccess={lifetimeAccess}
            centerSlotRef={centerSlotRef}
          />
        )}

        {outlineStatus !== "idle" && (
          <div className="mb-3 flex items-center gap-2 font-mono text-xs">
            {outlineStatus === "drafting" ? (
              <span className="flex items-center gap-2 text-[var(--color-accent)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)]" />
                drafting your article…
              </span>
            ) : (
              <span className="text-red-600">Couldn&apos;t write that draft — try again.</span>
            )}
          </div>
        )}

        {hasSelection && !editorFocused && !pendingSuggestion && (
          <div className="pointer-events-none absolute inset-0">
            {highlightRects.map((r, i) => (
              <div
                key={i}
                className="absolute bg-[var(--color-accent-tint)]"
                style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
              />
            ))}
          </div>
        )}

        <div
          className={`prose-doc font-serif text-[19px] leading-[1.9] text-[var(--color-ink)] ${
            pendingSuggestion ? "hidden" : ""
          }`}
        >
          <EditorContent editor={editor} />
        </div>

        {hasSelection && !pendingSuggestion && (
          <SelectionToolbar
            top={toolbarPos.top}
            left={toolbarPos.left}
            containerWidth={toolbarPos.containerWidth}
            disabled={isThinking}
            onAction={onQuickEdit}
          />
        )}

        {tableRect && editorFocused && !pendingSuggestion && editor && (
          <>
            <button
              type="button"
              title="Add row below"
              aria-label="Add row below"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => appendTableRowOrColumn(editor, "row")}
              className="absolute z-10 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] text-xs leading-none text-[var(--color-ink-muted)] shadow-sm transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              style={{ top: tableRect.top + tableRect.height - 10, left: tableRect.left + tableRect.width / 2 - 10 }}
            >
              +
            </button>
            <button
              type="button"
              title="Add column right"
              aria-label="Add column right"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => appendTableRowOrColumn(editor, "column")}
              className="absolute z-10 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] text-xs leading-none text-[var(--color-ink-muted)] shadow-sm transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              style={{ top: tableRect.top + tableRect.height / 2 - 10, left: tableRect.left + tableRect.width - 10 }}
            >
              +
            </button>
          </>
        )}

        {pendingSuggestion && (
          <div className="w-full font-serif text-[19px] leading-[1.9] text-[var(--color-ink)]">
            <div className="prose-doc" dangerouslySetInnerHTML={{ __html: beforeHtml }} />

            <div className="animate-suggestion-fade-in my-2 rounded-lg border border-[var(--color-accent-tint-border)] bg-[var(--color-accent-tint)] px-4 py-3">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)]">
                {pendingSuggestion.wholeDocument ? "Proposed rewrite of the whole document" : MODE_LABEL[pendingSuggestion.mode]}
                {!pendingSuggestion.wholeDocument &&
                  pendingSuggestion.fellBackToAppend &&
                  " · nothing was selected, appended instead"}
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
                  onClick={handleAccept}
                  className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-sans text-xs font-medium text-white hover:bg-[var(--color-accent-hover)]"
                >
                  Accept
                </button>
                <button
                  onClick={handleReject}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 font-sans text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-inset)]"
                >
                  Reject
                </button>
              </span>
            </div>

            <div className="prose-doc" dangerouslySetInnerHTML={{ __html: afterHtml }} />
          </div>
        )}

      </div>
    </div>
  );
});

export default DocumentPanel;
