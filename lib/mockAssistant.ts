import type { ChatMessage, Selection } from "./types";

type MockInput = {
  messages: ChatMessage[];
  document: string;
  selection: Selection;
};

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function tighten(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function lastSentence(text: string): string {
  const parts = text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/**
 * Stand-in for a real model call. Produces the same delimiter-wrapped shape
 * a real LLM reply would, so it flows through the exact same parser as the
 * (commented-out) real Anthropic integration in app/api/chat/route.ts.
 */
export function generateMockReply({ messages, document, selection }: MockInput): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = (lastUser?.content ?? "").toLowerCase();
  const hasSelection = selection.end > selection.start;
  const selectedText = document.slice(selection.start, selection.end);

  const wantsRewrite = /rewrite|reword|improve|polish|tighten|shorter|concise|clean ?up/.test(text);
  const wantsInsert = /insert|add .*(sentence|line|word|note)|right here|at (the )?cursor/.test(text);
  const wantsContinue = /continue|keep going|more\b|next paragraph|what happens next|finish (it|this)/.test(text);

  if (wantsRewrite) {
    const source = hasSelection ? selectedText : lastSentence(document) || document;
    const rewritten = tighten(source);
    const comment = pick(["Tightened that up.", "Cleaner version below.", "A more direct pass."]);
    return `${comment}\n\n---REPLACE_SELECTION---\n${rewritten}\n---END---`;
  }

  if (wantsInsert) {
    const clause = pick([
      "a small but telling detail here",
      "one more concrete example",
      "a brief aside that grounds the reader",
    ]);
    const comment = pick(["Added a quick line at your cursor.", "Dropped in a short addition."]);
    return `${comment}\n\n---INSERT_AT_CURSOR---\n(${clause})\n---END---`;
  }

  if (wantsContinue) {
    const seed = lastSentence(document);
    const paragraph = seed
      ? `Following on from "${seed.slice(0, 60)}${seed.length > 60 ? "…" : ""}", the next beat could push the idea one step further — naming the stakes plainly before moving on.`
      : "Start with the single clearest sentence you can write about this — the rest of the paragraph can react to it.";
    const comment = pick(["Added a paragraph to carry it forward.", "Here's a continuation."]);
    return `${comment}\n\n---APPEND---\n${paragraph}\n---END---`;
  }

  if (document.trim() === "") {
    return "The page is empty — want me to draft an opening line, or do you have one in mind?";
  }

  if (hasSelection) {
    return pick([
      `Looking at "${selectedText.slice(0, 40)}${selectedText.length > 40 ? "…" : ""}" — want me to rewrite it, or just talking it through?`,
      "Got it. Say the word if you'd like me to rewrite that selection.",
    ]);
  }

  return pick([
    "Got it. Want me to expand on that, tighten a section, or add a paragraph?",
    "Sure — point me at a part of the draft, or tell me what to add.",
    "Noted. Let me know when you want me to touch the document.",
  ]);
}
