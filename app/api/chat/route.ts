import { NextResponse } from "next/server";
import { parseAssistantReply } from "@/lib/suggestionParser";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

type RequestBody = {
  messages: ChatMessage[];
  document: string;
  /** selected text, resolved client-side from the live editor; null if there's no selection */
  selectedText: string | null;
  /** plain text immediately before/after the cursor, resolved client-side (only meaningful when selectedText is null) */
  cursorContextBefore: string;
  cursorContextAfter: string;
};

function buildContextPrompt(
  document: string,
  selectedText: string | null,
  cursorContextBefore: string,
  cursorContextAfter: string
): string {
  let selectionNote: string;
  if (selectedText !== null) {
    selectionNote = `The user currently has this selected:\n"""\n${selectedText}\n"""`;
  } else {
    selectionNote =
      `The user has no active selection.\n` +
      `Text immediately before the cursor: "${cursorContextBefore}"\n` +
      (cursorContextAfter
        ? `Text immediately after the cursor: "${cursorContextAfter}"`
        : "There is nothing after the cursor — it's at the end of the document.") +
      `\nWhen using INSERT_AT_CURSOR, continue naturally from the text immediately before the cursor (e.g. finish an incomplete sentence or thought) and flow into whatever comes after it, if anything.`;
  }
  return `${SYSTEM_PROMPT}\n\nCurrent full document:\n"""\n${document}\n"""\n\n${selectionNote}`;
}

async function callGemini(
  messages: ChatMessage[],
  document: string,
  selectedText: string | null,
  cursorContextBefore: string,
  cursorContextAfter: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local to use the Gemini test provider.");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildContextPrompt(document, selectedText, cursorContextBefore, cursorContextAfter) }],
        },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const { messages, document, selectedText, cursorContextBefore, cursorContextAfter } = body;
  if (!Array.isArray(messages) || typeof document !== "string") {
    return NextResponse.json({ error: "Missing messages or document." }, { status: 400 });
  }

  try {
    // ---- GEMINI FLASH LITE (latest, active) ------------------------------
    // Free-tier real model, used to test look-and-feel before switching to
    // a paid provider for production. Needs GEMINI_API_KEY in .env.local.
    const raw = await callGemini(
      messages,
      document,
      selectedText ?? null,
      cursorContextBefore ?? "",
      cursorContextAfter ?? ""
    );

    // ---- FAKE / MOCK MODE (commented out) ------------------------------
    // Deterministic, no network, no API key — useful as an offline fallback
    // while iterating on UI with zero cost/latency.
    //
    // import { generateMockReply } from "@/lib/mockAssistant";
    // await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 600));
    // const raw = generateMockReply({ messages, document, selection });
    // ---------------------------------------------------------------------

    // ---- REAL ANTHROPIC MODE (commented out, for production) ----------
    // To switch to the paid production API:
    //   1. npm install @anthropic-ai/sdk
    //   2. Add ANTHROPIC_API_KEY to .env.local
    //   3. Delete/comment the GEMINI block above and uncomment this block
    //
    // import Anthropic from "@anthropic-ai/sdk";
    // const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    //
    // const response = await anthropic.messages.create({
    //   model: "claude-sonnet-5",
    //   max_tokens: 1024,
    //   system: buildContextPrompt(document, selection),
    //   messages: messages.map((m) => ({ role: m.role, content: m.content })),
    // });
    //
    // const raw = response.content
    //   .filter((block): block is Anthropic.TextBlock => block.type === "text")
    //   .map((block) => block.text)
    //   .join("\n");
    // ---------------------------------------------------------------------

    const parsed = parseAssistantReply(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("chat api error", err);
    const message = err instanceof Error ? err.message : "The writing assistant is unavailable right now.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
