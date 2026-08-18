import { NextResponse } from "next/server";
import { parseAssistantReply } from "@/lib/suggestionParser";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUsage, incrementUsage } from "@/lib/serverCredits";
import { FREE_GENERATIONS_LIMIT } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

// Full-quality tier: BYOK, lifetime access, or still-in-credit guests.
// gemini-flash-latest has been overloaded/rate-limited more often lately, so
// gemini-2.5-flash (a pinned version with its own capacity pool) is primary.
const STANDARD_MODEL = "gemini-3.5-flash-lite";
// Tried once, automatically, only when STANDARD_MODEL itself is overloaded/
// rate-limited (502/503/429) — a different model has its own capacity pool,
// so this rides out Google-side demand spikes without surfacing an error.
const STANDARD_MODEL_FALLBACK = "gemini-2.5-flash";
// Fallback tier once a guest's free generations run out and they choose to
// keep going anyway ("continue with poor quality" in the upgrade popup).
const DEGRADED_MODEL = "gemini-2.5-flash";

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
  /** true once the user has explicitly chosen "continue with lower quality" in the upgrade popup */
  acceptDegraded?: boolean;
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
  cursorContextAfter: string,
  apiKey: string,
  model: string
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
  let model: string;
  let creditsRemaining: number | null = null;
  let degraded = false;
  let shouldIncrementUsage = false;
  let keySource: string;

  if (userKey) {
    // BYOK — unlimited, full quality, runs against the user's own quota.
    apiKey = userKey;
    model = STANDARD_MODEL;
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
      model = STANDARD_MODEL;
    } else if (usage.freeGenerationsUsed < usage.freeGenerationsLimit) {
      apiKey = sharedKey;
      model = STANDARD_MODEL;
      shouldIncrementUsage = true;
      creditsRemaining = usage.freeGenerationsLimit - usage.freeGenerationsUsed;
    } else if (!body.acceptDegraded) {
      return NextResponse.json(
        {
          error: "You've used your free generations.",
          code: "credits_exhausted",
          freeGenerationsUsed: usage.freeGenerationsUsed,
          freeGenerationsLimit: usage.freeGenerationsLimit,
        },
        { status: 402 }
      );
    } else {
      apiKey = sharedKey;
      model = DEGRADED_MODEL;
      degraded = true;
      creditsRemaining = 0;
    }
  }

  try {
    let raw: string;
    try {
      raw = await callGemini(
        messages,
        document,
        selectedText ?? null,
        cursorContextBefore ?? "",
        cursorContextAfter ?? "",
        apiKey,
        model
      );
    } catch (err) {
      const isOverloaded = err instanceof GeminiRequestError && [429, 502, 503].includes(err.status);
      if (!isOverloaded || model !== STANDARD_MODEL) throw err;
      console.warn(`${STANDARD_MODEL} unavailable (${(err as GeminiRequestError).status}), retrying with ${STANDARD_MODEL_FALLBACK}`);
      raw = await callGemini(
        messages,
        document,
        selectedText ?? null,
        cursorContextBefore ?? "",
        cursorContextAfter ?? "",
        apiKey,
        STANDARD_MODEL_FALLBACK
      );
    }

    if (shouldIncrementUsage) {
      const newCount = await incrementUsage(uid);
      creditsRemaining = Math.max(0, FREE_GENERATIONS_LIMIT - newCount);
    }

    const parsed = parseAssistantReply(raw);
    const response = NextResponse.json({ ...parsed, creditsRemaining, degraded });
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
