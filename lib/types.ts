export type SuggestionMode = "append" | "replace_selection" | "insert_at_cursor";

export type Suggestion = {
  /** id of the assistant chat message this suggestion belongs to */
  messageId: string;
  mode: SuggestionMode;
  /** current (possibly user-edited) proposed text */
  text: string;
  /** all alternatives offered for this suggestion; length 1 in the common case */
  options: string[];
  /** which entry in `options` is currently selected/loaded into `text` */
  optionIndex: number;
  /** range (as ProseMirror document positions in the live editor) this
   *  suggestion applies to. For append/insert this is a zero-length range
   *  (start === end). */
  rangeStart: number;
  rangeEnd: number;
  /** true when a replace_selection request had to fall back to append
   *  because nothing was selected at proposal time */
  fellBackToAppend: boolean;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** present on assistant messages that produced a document suggestion */
  suggestionMode?: SuggestionMode;
  /** true if this message resulted in an error talking to the assistant */
  isError?: boolean;
};

export type Selection = {
  start: number;
  end: number;
};

export type ChatApiResponse = {
  comment: string;
  suggestion: { mode: SuggestionMode; options: string[] } | null;
  /** free generations left on the shared key; null when unlimited (BYOK or lifetime access) */
  creditsRemaining: number | null;
  /** true if this response was generated with the cheaper fallback model */
  degraded: boolean;
};

export type ChatApiError = {
  error: string;
  /** distinguishes "out of free credits" from a generic failure, so the
   *  client can show the upgrade popup instead of a chat error bubble */
  code?: "credits_exhausted";
  freeGenerationsUsed?: number;
  freeGenerationsLimit?: number;
};
