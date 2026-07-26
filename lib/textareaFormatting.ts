// Formatting helpers that mutate a <textarea> DOM node directly via
// document.execCommand("insertText", ...). That (rather than setting
// el.value) is what keeps the browser's native undo/redo stack intact and
// fires a real "input" event, which is what a React controlled <textarea>
// listens to — so onChange still fires correctly after each action.

export type Align = "left" | "center" | "right";

function insertTextAtSelection(el: HTMLTextAreaElement, text: string) {
  const ok = typeof document.execCommand === "function" && document.execCommand("insertText", false, text);
  if (!ok) {
    const { selectionStart: start, selectionEnd: end, value } = el;
    el.value = value.slice(0, start) + text + value.slice(end);
    el.setSelectionRange(start + text.length, start + text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function getLineBlock(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = value.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = value.length;
  return { lineStart, lineEnd };
}

/** Replace the full line(s) covering the current selection with `transform(lines)`. */
function transformLineBlock(el: HTMLTextAreaElement, transform: (lines: string[]) => string[]) {
  const { selectionStart: start, selectionEnd: end, value } = el;
  const { lineStart, lineEnd } = getLineBlock(value, start, end);
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const replacement = transform(lines).join("\n");

  el.focus();
  el.setSelectionRange(lineStart, lineEnd);
  insertTextAtSelection(el, replacement);
  el.setSelectionRange(lineStart, lineStart + replacement.length);
}

/** Wrap (or unwrap, if already wrapped) the current selection with inline markers, e.g. **bold**. */
export function wrapSelection(el: HTMLTextAreaElement, before: string, after: string, placeholder: string) {
  const { selectionStart: start, selectionEnd: end, value } = el;
  const selected = value.slice(start, end);

  el.focus();

  if (!selected) {
    el.setSelectionRange(start, end);
    insertTextAtSelection(el, `${before}${placeholder}${after}`);
    el.setSelectionRange(start + before.length, start + before.length + placeholder.length);
    return;
  }

  const alreadyWrapped = selected.length >= before.length + after.length && selected.startsWith(before) && selected.endsWith(after);

  el.setSelectionRange(start, end);
  if (alreadyWrapped) {
    const unwrapped = selected.slice(before.length, selected.length - after.length);
    insertTextAtSelection(el, unwrapped);
    el.setSelectionRange(start, start + unwrapped.length);
  } else {
    insertTextAtSelection(el, `${before}${selected}${after}`);
    el.setSelectionRange(start + before.length, start + before.length + selected.length);
  }
}

export function toggleHeading(el: HTMLTextAreaElement, level: 1 | 2 | 3) {
  const marker = `${"#".repeat(level)} `;
  transformLineBlock(el, (lines) =>
    lines.map((line) => {
      const match = line.match(/^(#{1,6})\s+/);
      const stripped = line.replace(/^#{1,6}\s+/, "");
      const isSameLevel = !!match && match[1].length === level;
      return isSameLevel ? stripped : marker + stripped;
    })
  );
}

export function toggleBulletList(el: HTMLTextAreaElement) {
  transformLineBlock(el, (lines) => {
    const nonBlank = lines.filter((l) => l.trim().length > 0);
    const allBulleted = nonBlank.length > 0 && nonBlank.every((l) => /^\s*[-*]\s+/.test(l));
    return lines.map((l) => {
      if (!l.trim()) return l;
      if (allBulleted) return l.replace(/^(\s*)[-*]\s+/, "$1");
      return /^\s*[-*]\s+/.test(l) ? l : `- ${l}`;
    });
  });
}

export function toggleNumberedList(el: HTMLTextAreaElement) {
  transformLineBlock(el, (lines) => {
    const nonBlank = lines.filter((l) => l.trim().length > 0);
    const allNumbered = nonBlank.length > 0 && nonBlank.every((l) => /^\s*\d+\.\s+/.test(l));
    let n = 0;
    return lines.map((l) => {
      if (!l.trim()) return l;
      const stripped = l.replace(/^\s*\d+\.\s+/, "").replace(/^\s*[-*]\s+/, "");
      if (allNumbered) return stripped;
      n += 1;
      return `${n}. ${stripped}`;
    });
  });
}

export function toggleQuote(el: HTMLTextAreaElement) {
  transformLineBlock(el, (lines) => {
    const nonBlank = lines.filter((l) => l.trim().length > 0);
    const allQuoted = nonBlank.length > 0 && nonBlank.every((l) => /^\s*>\s?/.test(l));
    return lines.map((l) => {
      if (!l.trim()) return l;
      return allQuoted ? l.replace(/^\s*>\s?/, "") : `> ${l}`;
    });
  });
}

/**
 * Markdown has no native text-alignment. This wraps the block in a raw HTML
 * <div align="..."> tag — inert in this plain-text editor, but honored by
 * markdown renderers that allow embedded HTML if the draft is exported and
 * viewed elsewhere.
 */
export function toggleAlign(el: HTMLTextAreaElement, align: Align) {
  const { selectionStart: start, selectionEnd: end, value } = el;
  const { lineStart, lineEnd } = getLineBlock(value, start, end);
  const block = value.slice(lineStart, lineEnd);

  const match = block.match(/^<div align="(left|center|right)">\n([\s\S]*)\n<\/div>$/);
  const replacement = match
    ? match[1] === align
      ? match[2]
      : `<div align="${align}">\n${match[2]}\n</div>`
    : `<div align="${align}">\n${block}\n</div>`;

  el.focus();
  el.setSelectionRange(lineStart, lineEnd);
  insertTextAtSelection(el, replacement);
  el.setSelectionRange(lineStart, lineStart + replacement.length);
}

export function insertLink(el: HTMLTextAreaElement) {
  const { selectionStart: start, selectionEnd: end, value } = el;
  const selected = value.slice(start, end) || "link text";
  const url = window.prompt("Link URL", "https://");
  if (!url) return;

  el.focus();
  el.setSelectionRange(start, end);
  const text = `[${selected}](${url})`;
  insertTextAtSelection(el, text);
  el.setSelectionRange(start, start + text.length);
}

export function insertImage(el: HTMLTextAreaElement) {
  const { selectionStart: start, selectionEnd: end, value } = el;
  const alt = value.slice(start, end) || "image";
  const url = window.prompt("Image URL", "https://");
  if (!url) return;

  el.focus();
  el.setSelectionRange(start, end);
  const text = `![${alt}](${url})`;
  insertTextAtSelection(el, text);
  el.setSelectionRange(start, start + text.length);
}

export function undoEdit(el: HTMLTextAreaElement) {
  el.focus();
  document.execCommand("undo");
}

export function redoEdit(el: HTMLTextAreaElement) {
  el.focus();
  document.execCommand("redo");
}
