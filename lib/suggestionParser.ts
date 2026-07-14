import type { ChatApiResponse, SuggestionMode } from "./types";

const MARKERS: { tag: string; mode: SuggestionMode }[] = [
  { tag: "APPEND", mode: "append" },
  { tag: "REPLACE_SELECTION", mode: "replace_selection" },
  { tag: "INSERT_AT_CURSOR", mode: "insert_at_cursor" },
];

/**
 * Splits a raw assistant reply into a short conversational comment and an
 * optional document suggestion. The model is instructed to wrap document
 * content in ---MODE---...---END--- delimiters; anything outside that block
 * is the conversational comment.
 */
export function parseAssistantReply(raw: string): ChatApiResponse {
  for (const { tag, mode } of MARKERS) {
    const startMarker = `---${tag}---`;
    const startIdx = raw.indexOf(startMarker);
    if (startIdx === -1) continue;

    const contentStart = startIdx + startMarker.length;
    const endIdx = raw.indexOf("---END---", contentStart);
    const contentEnd = endIdx === -1 ? raw.length : endIdx;
    const afterIdx = endIdx === -1 ? raw.length : endIdx + "---END---".length;

    const content = raw.slice(contentStart, contentEnd).trim();
    const comment = (raw.slice(0, startIdx) + raw.slice(afterIdx)).trim();

    return { comment, suggestion: { mode, content } };
  }

  return { comment: raw.trim(), suggestion: null };
}
