"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";

type FormattingToolbarProps = {
  editor: Editor | null;
};

type Align = "left" | "center" | "right";

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-[var(--color-border)]" />;
}

type ButtonProps = {
  title: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
};

function ToolbarButton({ title, onClick, active = false, className = "", children }: ButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)] active:scale-95 ${
        active ? "bg-[var(--color-accent-tint)] text-[var(--color-accent)]" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function FormattingToolbar({ editor }: FormattingToolbarProps) {
  const state = useEditorState({
    editor,
    selector: (ctx) =>
      ctx.editor
        ? {
            bold: ctx.editor.isActive("bold"),
            italic: ctx.editor.isActive("italic"),
            underline: ctx.editor.isActive("underline"),
            strike: ctx.editor.isActive("strike"),
            h1: ctx.editor.isActive("heading", { level: 1 }),
            h2: ctx.editor.isActive("heading", { level: 2 }),
            h3: ctx.editor.isActive("heading", { level: 3 }),
            bulletList: ctx.editor.isActive("bulletList"),
            orderedList: ctx.editor.isActive("orderedList"),
            blockquote: ctx.editor.isActive("blockquote"),
            link: ctx.editor.isActive("link"),
            highlight: ctx.editor.isActive("highlight"),
            alignLeft: ctx.editor.isActive({ textAlign: "left" }),
            alignCenter: ctx.editor.isActive({ textAlign: "center" }),
            alignRight: ctx.editor.isActive({ textAlign: "right" }),
            insideTable: ctx.editor.isActive("table"),
            canUndo: ctx.editor.can().undo(),
            canRedo: ctx.editor.can().redo(),
          }
        : null,
  });

  if (!editor || !state) return null;

  function run(fn: (editor: Editor) => void) {
    if (!editor) return;
    fn(editor);
  }

  function insertLink() {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    run((e) => e.chain().focus().extendMarkRange("link").setLink({ href: url }).run());
  }

  function insertImage() {
    const url = window.prompt("Image URL", "https://");
    if (!url) return;
    const alt = window.prompt("Alt text (optional)", "") ?? "";
    run((e) => e.chain().focus().setImage({ src: url, alt }).run());
  }

  function toggleAlign(align: Align) {
    run((e) => e.chain().focus().toggleTextAlign(align).run());
  }

  function insertTable() {
    run((e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run());
  }

  function addRow() {
    run((e) => e.chain().focus().addRowAfter().run());
  }

  function addColumn() {
    run((e) => e.chain().focus().addColumnAfter().run());
  }

  function deleteRow() {
    run((e) => e.chain().focus().deleteRow().run());
  }

  function deleteColumn() {
    run((e) => e.chain().focus().deleteColumn().run());
  }

  function deleteTable() {
    run((e) => e.chain().focus().deleteTable().run());
  }

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto py-1">
      <ToolbarButton
        title="Bold"
        active={state.bold}
        className="font-sans text-[13px] font-bold"
        onClick={() => run((e) => e.chain().focus().toggleBold().run())}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={state.italic}
        className="font-sans text-[13px] italic"
        onClick={() => run((e) => e.chain().focus().toggleItalic().run())}
      >
        I
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        active={state.underline}
        className="font-sans text-[13px] underline"
        onClick={() => run((e) => e.chain().focus().toggleUnderline().run())}
      >
        U
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        active={state.strike}
        className="font-sans text-[13px] line-through"
        onClick={() => run((e) => e.chain().focus().toggleStrike().run())}
      >
        S
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Heading 1"
        active={state.h1}
        className="font-mono text-[11px] font-semibold"
        onClick={() => run((e) => e.chain().focus().toggleHeading({ level: 1 }).run())}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        title="Heading 2"
        active={state.h2}
        className="font-mono text-[11px] font-semibold"
        onClick={() => run((e) => e.chain().focus().toggleHeading({ level: 2 }).run())}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        active={state.h3}
        className="font-mono text-[11px] font-semibold"
        onClick={() => run((e) => e.chain().focus().toggleHeading({ level: 3 }).run())}
      >
        H3
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Bulleted list"
        active={state.bulletList}
        onClick={() => run((e) => e.chain().focus().toggleBulletList().run())}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="2" cy="4" r="1" fill="currentColor" />
          <circle cx="2" cy="8" r="1" fill="currentColor" />
          <circle cx="2" cy="12" r="1" fill="currentColor" />
          <line x1="5.5" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="5.5" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="5.5" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={state.orderedList}
        onClick={() => run((e) => e.chain().focus().toggleOrderedList().run())}
      >
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

      <ToolbarButton title="Link" active={state.link} onClick={insertLink}>
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
      <ToolbarButton title="Image" onClick={insertImage}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="5.2" cy="6.2" r="1.1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 11.5 5.5 8l2.5 2.5 2-2 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        </svg>
      </ToolbarButton>
      <ToolbarButton title="Table" onClick={insertTable}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <line x1="1.5" y1="6.3" x2="14.5" y2="6.3" stroke="currentColor" strokeWidth="1.1" />
          <line x1="1.5" y1="10.1" x2="14.5" y2="10.1" stroke="currentColor" strokeWidth="1.1" />
          <line x1="5.8" y1="2.5" x2="5.8" y2="13.5" stroke="currentColor" strokeWidth="1.1" />
          <line x1="10.2" y1="2.5" x2="10.2" y2="13.5" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        title="Quote"
        active={state.blockquote}
        onClick={() => run((e) => e.chain().focus().toggleBlockquote().run())}
      >
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
      <ToolbarButton
        title="Highlight"
        active={state.highlight}
        onClick={() => run((e) => e.chain().focus().toggleHighlight().run())}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M10.5 2.5 13.5 5.5 6 13H3v-3L10.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
          <path d="M9 4 12 7" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </ToolbarButton>

      <Divider />

      {(["left", "center", "right"] as Align[]).map((align) => (
        <ToolbarButton
          key={align}
          title={`Align ${align}`}
          active={align === "left" ? state.alignLeft : align === "center" ? state.alignCenter : state.alignRight}
          onClick={() => toggleAlign(align)}
        >
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

      {state.insideTable && (
        <>
          <Divider />

          <ToolbarButton title="Add row below" onClick={addRow}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="13" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <line x1="1.5" y1="5" x2="14.5" y2="5" stroke="currentColor" strokeWidth="1" />
              <line x1="5.8" y1="1.5" x2="5.8" y2="8.5" stroke="currentColor" strokeWidth="1" />
              <line x1="10.2" y1="1.5" x2="10.2" y2="8.5" stroke="currentColor" strokeWidth="1" />
              <path d="M8 11.2v3M6.5 12.7h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title="Add column right" onClick={addColumn}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1.5" width="8" height="13" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <line x1="5" y1="1.5" x2="5" y2="14.5" stroke="currentColor" strokeWidth="1" />
              <line x1="1" y1="6.2" x2="9" y2="6.2" stroke="currentColor" strokeWidth="1" />
              <line x1="1" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="1" />
              <path d="M12.2 6.5v3M10.7 8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title="Delete row" onClick={deleteRow}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="13" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <line x1="1.5" y1="5" x2="14.5" y2="5" stroke="currentColor" strokeWidth="1" />
              <line x1="5.8" y1="1.5" x2="5.8" y2="8.5" stroke="currentColor" strokeWidth="1" />
              <line x1="10.2" y1="1.5" x2="10.2" y2="8.5" stroke="currentColor" strokeWidth="1" />
              <path d="M6.5 12.7h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title="Delete column" onClick={deleteColumn}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1.5" width="8" height="13" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <line x1="5" y1="1.5" x2="5" y2="14.5" stroke="currentColor" strokeWidth="1" />
              <line x1="1" y1="6.2" x2="9" y2="6.2" stroke="currentColor" strokeWidth="1" />
              <line x1="1" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="1" />
              <path d="M10.7 8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title="Delete table" onClick={deleteTable}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.2 4.5l.6 8.3a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9l.6-8.3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </ToolbarButton>
        </>
      )}

      <Divider />

      <ToolbarButton title="Undo" onClick={() => run((e) => e.chain().focus().undo().run())}>
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
      <ToolbarButton title="Redo" onClick={() => run((e) => e.chain().focus().redo().run())}>
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
