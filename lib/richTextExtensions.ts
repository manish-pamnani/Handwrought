import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { Markdown } from "tiptap-markdown";

/**
 * tiptap-markdown doesn't augment TipTap core's `Storage` type, so
 * `editor.storage.markdown` isn't known to TypeScript out of the box.
 */
export function getMarkdown(editor: Editor): string {
  return (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
}

/**
 * Shared TipTap extension set. The live editor and the read-only preview
 * renderer (for pending-suggestion "before"/"after" slices) must both use
 * this exact array so their HTML/markdown output stays consistent.
 *
 * `Underline` and `Link` come from StarterKit itself (bundled by default in
 * TipTap v3) — registering separate instances of those would duplicate the
 * extension name and throw.
 */
export const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Highlight,
  TextAlign.configure({
    types: ["heading", "paragraph"],
    alignments: ["left", "center", "right"],
  }),
  // Paste-your-own-draft discoverability is handled pre-click by
  // GuidedAnnotations' third arrow instead — an in-editor placeholder can
  // only ever confirm it after the fact, once the user has already clicked
  // in blind.
  // Placeholder.configure({
  //   placeholder: "Start writing, or ask the assistant for a hand…",
  // }),
  Image,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  Markdown,
];
