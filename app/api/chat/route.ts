import { NextResponse } from "next/server";
import { parseAssistantReply } from "@/lib/suggestionParser";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUsage, incrementUsage, consumeCredit } from "@/lib/serverCredits";
import {
  FREE_GENERATIONS_LIMIT,
  FREE_TIER_MAX_CHARS,
  FREE_TIER_MAX_OUTPUT_TOKENS,
  FREE_TIER_RATE_LIMIT_PER_HOUR,
} from "@/lib/constants";
import { callGeminiWithRotation, type GeminiModel } from "@/lib/geminiModels";
import { verifyAppCheck } from "@/lib/appCheck";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
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
  model: GeminiModel,
  maxOutputTokens?: number
): Promise<string> {
  // The system instruction carries the full document for tone/voice context,
  // which on smaller models can dilute or outweigh the (comparatively tiny)
  // selection note also living in that same block — the model ends up
  // treating the whole document as fair game instead of just the selection.
  // Re-anchoring the selection directly in the last user turn puts it where
  // the model's next-token generation is most influenced, instead of relying
  // solely on system-level instructions to compete with a full document dump.
  const contents = messages.map((m, i) => {
    const isLastUserTurn = i === messages.length - 1 && m.role === "user";
    const text =
      isLastUserTurn && selectedText !== null
        ? `Selected text (replace ONLY this — do not rewrite or restructure any other part of the document):\n"""\n${selectedText}\n"""\n\nInstruction: ${m.content}`
        : m.content;
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    };
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildContextPrompt(document, selectedText, cursorContextBefore, cursorContextAfter) }],
        },
        contents,
        ...(maxOutputTokens && { generationConfig: { maxOutputTokens } }),
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
  if (!(await verifyAppCheck(req))) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }

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
  let shouldConsumeCredit = false;
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
    if (usage.tier) {
      if (usage.creditsRemaining <= 0) {
        return NextResponse.json(
          {
            error: "You've used all your credits for this cycle. They'll refresh in your next 30-day cycle.",
            code: "credits_exhausted",
            creditsRemaining: 0,
          },
          { status: 402 }
        );
      }
      apiKey = sharedKey;
      shouldConsumeCredit = true;
    } else if (usage.freeGenerationsUsed < usage.freeGenerationsLimit) {
      // Free generations are otherwise unbounded in size, and a fresh
      // anonymous session (no signup friction) gets a fresh 5 of them — cap
      // content size so a single free generation can't be made arbitrarily
      // expensive. Paid tiers and BYOK are unaffected.
      const freeTierChars = document.length + (selectedText?.length ?? 0) + messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
      if (freeTierChars > FREE_TIER_MAX_CHARS) {
        return NextResponse.json(
          { error: "Free generations are capped at around 700 words of document and message content — upgrade to continue with a longer document." },
          { status: 400 }
        );
      }

      // Backstop against the same abuse resetting anonymous sessions to keep
      // re-claiming free generations from one IP — independent of uid.
      const allowed = await checkRateLimit("free_generation", getClientIp(req), FREE_TIER_RATE_LIMIT_PER_HOUR);
      if (!allowed) {
        return NextResponse.json(
          { error: "Too many free generations from this network right now — try again later, or upgrade for uninterrupted access." },
          { status: 429 }
        );
      }

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
    // Captured via closure since callGeminiWithRotation only hands the model
    // to the call it's about to make — this is reassigned on every retry, so
    // once callGeminiWithRotation resolves it holds whichever model actually
    // served the winning attempt (calls are sequential, never concurrent).
    let usedModel: GeminiModel | null = null;
    const raw = await callGeminiWithRotation((model) => {
      usedModel = model;
      return callGemini(
        messages,
        document,
        selectedText ?? null,
        cursorContextBefore ?? "",
        cursorContextAfter ?? "",
        apiKey,
        model,
        shouldIncrementUsage ? FREE_TIER_MAX_OUTPUT_TOKENS : undefined
      );
    });

    if (shouldConsumeCredit) {
      creditsRemaining = await consumeCredit(uid);
    } else if (shouldIncrementUsage) {
      const newCount = await incrementUsage(uid);
      creditsRemaining = Math.max(0, FREE_GENERATIONS_LIMIT - newCount);
    }

    const parsed = parseAssistantReply(raw);

    console.log(
      JSON.stringify({
        event: "chat_completion",
        uid,
        model: usedModel,
        keySource,
        hasSelection: selectedText !== null,
        selectionChars: selectedText?.length ?? 0,
        documentChars: document.length,
        suggestionMode: parsed.suggestion?.mode ?? null,
      })
    );

    // Tripwire for the "selection edit drifted into a whole-document rewrite"
    // failure mode: a real replace_selection reply should be roughly the
    // size of the selection and never introduce a heading the selection
    // didn't have. Flags it without blocking the response, so we get a
    // model/ratio/preview to grep for in logs instead of relying on user
    // screenshots to diagnose it after the fact.
    if (parsed.suggestion?.mode === "replace_selection" && selectedText !== null) {
      const HEADING_RE = /^#{1,6}\s/m;
      const LENGTH_RATIO_THRESHOLD = 3;
      const selectionHasHeading = HEADING_RE.test(selectedText);

      parsed.suggestion.options.forEach((option, optionIndex) => {
        const lengthRatio = selectedText.length > 0 ? option.length / selectedText.length : Infinity;
        const introducedHeading = HEADING_RE.test(option) && !selectionHasHeading;
        if (introducedHeading || lengthRatio > LENGTH_RATIO_THRESHOLD) {
          console.warn(
            JSON.stringify({
              event: "replace_selection_anomaly",
              uid,
              model: usedModel,
              optionIndex,
              selectionChars: selectedText.length,
              optionChars: option.length,
              lengthRatio: Number.isFinite(lengthRatio) ? Number(lengthRatio.toFixed(2)) : null,
              introducedHeading,
              selectionPreview: selectedText.slice(0, 120),
              optionPreview: option.slice(0, 120),
            })
          );
        }
      });
    }

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
