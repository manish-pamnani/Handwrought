import { NextResponse } from "next/server";
import { parseAssistantReply } from "@/lib/suggestionParser";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUsage, incrementUsage } from "@/lib/serverCredits";
import { FREE_GENERATIONS_LIMIT } from "@/lib/constants";
import { callGeminiWithRotation, type GeminiModel } from "@/lib/geminiModels";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

class GeminiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GeminiRequestError";
    this.status = status;
  }
}

type RequestBody = {
  messages: ChatMessage[];
  document: string;
  /** selected text, resolved client-side from the live editor; null if there's no selection */
  selectedText: string | null;
  /** plain text immediately before/after the cursor, resolved client-side (only meaningful when selectedText is null) */
  cursorContextBefore: string;
  cursorContextAfter: string;
  /** user-supplied Gemini API key (BYOK), read from client-side localStorage; null if not set */
  apiKey: string | null;
};

function buildContextPrompt(
  document: string,
  selectedText: string | null,
  cursorContextBefore: string,
  cursorContextAfter: string
): string {
  let selectionNote: string;
  if (selectedText !== null) {
    selectionNote =
      `The user currently has this selected:\n"""\n${selectedText}\n"""\n` +
      `This is a REPLACE_SELECTION request: base your replacement on this ` +
      `selected text and the user's instruction only. The full document ` +
      `below is background context for tone/voice/facts consistency — do ` +
      `not draw new content from it into the replacement.`;
  } else {
    selectionNote =
      `The user has no active selection.\n` +
      `Text immediately before the cursor: "${cursorContextBefore}"\n` +
      (cursorContextAfter
        ? `Text immediately after the cursor: "${cursorContextAfter}"`
        : "There is nothing after the cursor — it's at the end of the document.") +
      `\nWhen using INSERT_AT_CURSOR, continue naturally from the text immediately before the cursor (e.g. finish an incomplete sentence or thought) and flow into whatever comes after it, if anything.`;
  }
  return `${SYSTEM_PROMPT}\n\nCurrent full document (background context only):\n"""\n${document}\n"""\n\n${selectionNote}`;
}

async function callGemini(
  messages: ChatMessage[],
  document: string,
  selectedText: string | null,
  cursorContextBefore: string,
  cursorContextAfter: string,
  apiKey: string,
  model: GeminiModel
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
    throw new GeminiRequestError(res.status, `Gemini request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(idToken)).uid;
  } catch (err) {
    console.error("verifyIdToken failed:", err);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

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

  // ---- Resolve key + model + credit tier --------------------------------
  const userKey = typeof body.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : null;

  let apiKey: string;
  let creditsRemaining: number | null = null;
  let shouldIncrementUsage = false;
  let keySource: string;

  if (userKey) {
    // BYOK — unlimited, full quality, runs against the user's own quota.
    apiKey = userKey;
    keySource = "byok";
  } else {
    // Local-dev-only convenience so the route can be exercised without a
    // real shared-key secret configured; never used in production.
    const devFallback = process.env.NODE_ENV !== "production" ? process.env.GEMINI_API_KEY : undefined;
    const sharedKey = process.env.GEMINI_SHARED_API_KEY ?? devFallback ?? null;
    if (!sharedKey) {
      return NextResponse.json(
        { error: "Generation is temporarily unavailable. Add your own Gemini API key in Settings to continue." },
        { status: 503 }
      );
    }
    keySource = process.env.GEMINI_SHARED_API_KEY ? "shared" : "dev-fallback";

    const usage = await getUsage(uid);
    if (usage.lifetimeAccess) {
      apiKey = sharedKey;
    } else if (usage.freeGenerationsUsed < usage.freeGenerationsLimit) {
      apiKey = sharedKey;
      shouldIncrementUsage = true;
      creditsRemaining = usage.freeGenerationsLimit - usage.freeGenerationsUsed;
    } else {
      return NextResponse.json(
        {
          error: "You've used your free generations.",
          code: "credits_exhausted",
          freeGenerationsUsed: usage.freeGenerationsUsed,
          freeGenerationsLimit: usage.freeGenerationsLimit,
        },
        { status: 402 }
      );
    }
  }

  try {
    const raw = await callGeminiWithRotation((model) =>
      callGemini(
        messages,
        document,
        selectedText ?? null,
        cursorContextBefore ?? "",
        cursorContextAfter ?? "",
        apiKey,
        model
      )
    );

    if (shouldIncrementUsage) {
      const newCount = await incrementUsage(uid);
      creditsRemaining = Math.max(0, FREE_GENERATIONS_LIMIT - newCount);
    }

    const parsed = parseAssistantReply(raw);
    const response = NextResponse.json({ ...parsed, creditsRemaining });
    if (process.env.NODE_ENV !== "production") {
      response.headers.set("X-Gemini-Key-Source", keySource);
    }
    return response;
  } catch (err) {
    console.error("chat api error", err);
    const message = err instanceof Error ? err.message : "The writing assistant is unavailable right now.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
