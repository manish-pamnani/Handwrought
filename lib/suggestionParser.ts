import type { ChatApiResponse, SuggestionMode } from "./types";

const MARKERS: { tag: string; mode: SuggestionMode }[] = [
  { tag: "APPEND", mode: "append" },
  { tag: "REPLACE_SELECTION", mode: "replace_selection" },
  { tag: "INSERT_AT_CURSOR", mode: "insert_at_cursor" },
];

const END_MARKER = /-{3}\s*END\s*-{3}/;
const OPTION_SEPARATOR = /-{3}\s*OPTION\s*(?:-{3})?/;

/**
 * Splits a raw assistant reply into a short conversational comment and an
 * optional document suggestion. The model is instructed to wrap document
 * content in ---MODE---...---END--- delimiters (optionally with multiple
 * alternatives separated by ---OPTION---); anything outside that block is
 * the conversational comment.
 *
 * Matching is whitespace-tolerant (e.g. "--- REPLACE_SELECTION " with no
 * closing dashes) since smaller models don't always reproduce the exact
 * delimiter formatting from the system prompt.
 */
export function parseAssistantReply(raw: string): ChatApiResponse {
  for (const { tag, mode } of MARKERS) {
    const startMarker = new RegExp(`-{3}\\s*${tag}\\s*(?:-{3})?`);
    const startMatch = startMarker.exec(raw);
    if (!startMatch) continue;

    const contentStart = startMatch.index + startMatch[0].length;
    const endMatch = END_MARKER.exec(raw.slice(contentStart));
    const contentEnd = endMatch ? contentStart + endMatch.index : raw.length;
    const afterIdx = endMatch ? contentStart + endMatch.index + endMatch[0].length : raw.length;

    const rawContent = raw.slice(contentStart, contentEnd).trim();
    const options = rawContent
      .split(OPTION_SEPARATOR)
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length === 0) continue;

    const comment = (raw.slice(0, startMatch.index) + raw.slice(afterIdx)).trim();

    return { comment, suggestion: { mode, options } };
  }

  return { comment: raw.trim(), suggestion: null };
}
