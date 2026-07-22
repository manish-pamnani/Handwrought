// Text-affecting CSS properties that must be mirrored for the measurement
// div to wrap text identically to the real textarea.
const MIRRORED_PROPERTIES: (keyof CSSStyleDeclaration)[] = [
  "boxSizing",
  "width",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontSize",
  "fontFamily",
  "lineHeight",
  "textAlign",
  "textIndent",
  "letterSpacing",
  "wordSpacing",
];

export type CaretCoordinates = { top: number; left: number; height: number };
export type Rect = { top: number; left: number; width: number; height: number };

function createMirrorDiv(el: HTMLTextAreaElement): HTMLDivElement {
  const div = document.createElement("div");
  const computed = window.getComputedStyle(el);

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  for (const prop of MIRRORED_PROPERTIES) {
    (div.style as unknown as Record<string, string>)[prop as string] = computed[prop] as string;
  }
  return div;
}

/**
 * Returns the pixel offset (relative to the textarea's own top-left corner,
 * i.e. before subtracting scrollTop/scrollLeft) of the given character
 * position, using the standard "mirror div" technique — textareas have no
 * native API for this. Cloning the textarea's font/spacing properties onto
 * the hidden div means this works correctly for proportional fonts too, not
 * just monospace.
 */
export function getCaretCoordinates(el: HTMLTextAreaElement, position: number): CaretCoordinates {
  const div = createMirrorDiv(el);

  div.textContent = el.value.slice(0, position);
  const span = document.createElement("span");
  span.textContent = el.value.slice(position) || ".";
  div.appendChild(span);

  document.body.appendChild(div);
  const coords = { top: span.offsetTop, left: span.offsetLeft, height: span.offsetHeight };
  document.body.removeChild(div);

  return coords;
}

/**
 * Returns one rect per visually wrapped line the [start, end) range spans,
 * relative to the textarea's own top-left corner (before scroll offset).
 * Used to paint a selection highlight that survives the textarea losing
 * focus — native browser selection rendering only shows while focused, but
 * a DOM Range inside the mirror div has no such restriction.
 */
export function getSelectionRects(el: HTMLTextAreaElement, start: number, end: number): Rect[] {
  if (end <= start) return [];

  const div = createMirrorDiv(el);
  div.textContent = el.value;
  document.body.appendChild(div);

  const textNode = div.firstChild;
  if (!textNode) {
    document.body.removeChild(div);
    return [];
  }

  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
  const divRect = div.getBoundingClientRect();
  const rects = Array.from(range.getClientRects()).map((r) => ({
    top: r.top - divRect.top,
    left: r.left - divRect.left,
    width: r.width,
    height: r.height,
  }));

  document.body.removeChild(div);
  return rects;
}
