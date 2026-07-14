import { NextResponse } from "next/server";
import { generateMockReply } from "@/lib/mockAssistant";
import { parseAssistantReply } from "@/lib/suggestionParser";
import type { ChatMessage, Selection } from "@/lib/types";

export const runtime = "nodejs";

type RequestBody = {
  messages: ChatMessage[];
  document: string;
  selection: Selection;
};

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const { messages, document, selection } = body;
  if (!Array.isArray(messages) || typeof document !== "string" || !selection) {
    return NextResponse.json({ error: "Missing messages, document, or selection." }, { status: 400 });
  }

  try {
    // ---- FAKE / MOCK MODE (active) -----------------------------------
    // Simulates network + "thinking" latency and returns a deterministic
    // stand-in reply, wrapped in the same delimiters a real model would use.
    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 600));
    const raw = generateMockReply({ messages, document, selection });

    // ---- REAL ANTHROPIC MODE (commented out) --------------------------
    // To switch to the real API:
    //   1. npm install @anthropic-ai/sdk
    //   2. Add ANTHROPIC_API_KEY to .env.local
    //   3. Delete the FAKE/MOCK block above and uncomment the block below
    //
    // import Anthropic from "@anthropic-ai/sdk";
    // import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
    // const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    //
    // const selectionNote =
    //   selection.end > selection.start
    //     ? `The user currently has this selected (offsets ${selection.start}-${selection.end}):\n"""\n${document.slice(selection.start, selection.end)}\n"""`
    //     : "The user has no active selection right now.";
    //
    // const response = await anthropic.messages.create({
    //   model: "claude-sonnet-5",
    //   max_tokens: 1024,
    //   system: `${SYSTEM_PROMPT}\n\nCurrent full document:\n"""\n${document}\n"""\n\n${selectionNote}`,
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
    return NextResponse.json({ error: "The writing assistant is unavailable right now." }, { status: 502 });
  }
}
