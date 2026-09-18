import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUsage, accrueDictationSeconds, logUsageEvent } from "@/lib/serverCredits";
import { DICTATION_MAX_CLIP_SECONDS, DICTATION_MAX_FILE_BYTES, DICTATION_SECONDS_PER_CREDIT } from "@/lib/constants";
import { callGeminiWithRotation, extractGeminiUsage, type GeminiModel, type GeminiUsage } from "@/lib/geminiModels";
import { verifyAppCheck } from "@/lib/appCheck";

export const runtime = "nodejs";

// Does both transcription and the Wispr-Flow-style cleanup pass in one
// call, rather than raw verbatim transcription — dictated speech isn't
// publishable prose on its own (filler words, false starts, no punctuation
// intent), and that gap is most of what makes dictation feel worth using.
//
// The first version of this prompt ("lightly clean up... remove filler
// words") was too soft — real test audio (a rambling technical monologue,
// dozens of "uh"s, several immediate word repeats like "instead of instead
// of") came back with most of the fillers still in it. flash-lite (the
// first model in the rotation) reads a soft instruction as a suggestion,
// not a requirement, especially on longer clips where the instruction
// competes with a lot of raw content. Being explicit, exhaustive, and
// giving a worked example closes that gap far more reliably than restating
// "remove filler words" more emphatically would.
const DICTATION_PROMPT =
  "Transcribe the speech in this audio clip, then rewrite it as clean, publication-ready prose. This is a " +
  "REQUIRED rewrite, not an optional pass — every one of these must be gone from the output, with zero " +
  "exceptions:\n" +
  '- Verbal fillers: "um", "uh", "uhh", "er", "like" (only when it\'s a meaningless filler — keep it when ' +
  'it genuinely means "similar to" or "such as"), "you know", "I mean", and hedges like "kind of"/"sort of" ' +
  "when they're verbal tics rather than literal qualifiers.\n" +
  '- False starts, stutters, and immediate word or phrase repeats — e.g. "instead of instead of" becomes ' +
  '"instead of", "the the URL" becomes "the URL".\n' +
  "- Self-corrections and restarts — keep only the version the speaker settled on, drop the abandoned one.\n" +
  "Beyond removing those, fix punctuation, capitalization, and sentence boundaries so it reads as properly " +
  "structured prose. Do NOT summarize, shorten, paraphrase, or drop any real content — every substantive " +
  "word and idea the speaker said must survive, just without the disfluencies around it.\n\n" +
  "Example:\n" +
  'Raw: "So, uh, first we need, uh, the functional requirements. Uh, like, shorten the URL, then, uh, ' +
  'redirect the URL. These are the, uh, core features."\n' +
  'Cleaned: "First, we need the functional requirements: shorten the URL, then redirect the URL. These ' +
  'are the core features."\n\n' +
  "Output only the cleaned text, nothing else — no preamble, no quotes, no meta-commentary. If the clip " +
  "has no discernible speech, output nothing.";

async function callGemini(
  apiKey: string,
  model: GeminiModel,
  mimeType: string,
  base64: string
): Promise<{ text: string; usage: GeminiUsage }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: DICTATION_PROMPT }] },
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: mimeType, data: base64 } }] }],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const err = new Error(`Gemini request failed (${res.status}): ${errText}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim() ?? "";
  return { text, usage: extractGeminiUsage(data) };
}

export async function POST(request: Request) {
  if (!(await verifyAppCheck(request))) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
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

  // Voice dictation is a paid-tier perk, not part of the free/guest
  // generation pool — gated on tier alone, no BYOK bypass and no free-tier
  // fallback (unlike /api/chat and /api/import).
  const usage = await getUsage(uid);
  if (!usage.tier) {
    return NextResponse.json(
      { error: "Voice dictation is available on paid plans — upgrade to unlock it.", code: "paid_feature" },
      { status: 402 }
    );
  }
  if (usage.creditsRemaining <= 0) {
    return NextResponse.json(
      {
        error: "You've used all your credits — buy more anytime to keep dictating.",
        code: "credits_exhausted",
        creditsRemaining: 0,
      },
      { status: 402 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("audio");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No audio provided." }, { status: 400 });
  }
  if (file.size > DICTATION_MAX_FILE_BYTES) {
    return NextResponse.json({ error: "That recording is too large." }, { status: 400 });
  }

  // Client-reported clip length, used only for credit banking — clamped to
  // the same cap as the recorder itself enforces client-side. Worst-case
  // Gemini cost per request is already bounded by DICTATION_MAX_FILE_BYTES
  // above regardless of what's reported here.
  const durationRaw = Number(formData?.get("durationSeconds"));
  if (!Number.isFinite(durationRaw) || durationRaw <= 0) {
    return NextResponse.json({ error: "Missing recording duration." }, { status: 400 });
  }
  const durationSeconds = Math.min(DICTATION_MAX_CLIP_SECONDS, durationRaw);

  const devFallback = process.env.NODE_ENV !== "production" ? process.env.GEMINI_API_KEY : undefined;
  const sharedKey = process.env.GEMINI_SHARED_API_KEY ?? devFallback ?? null;
  if (!sharedKey) {
    return NextResponse.json({ error: "Dictation is temporarily unavailable." }, { status: 503 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "audio/webm";

  try {
    let usedModel: GeminiModel | null = null;
    const { text, usage: geminiUsage } = await callGeminiWithRotation((model) => {
      usedModel = model;
      return callGemini(sharedKey, model, mimeType, base64);
    });

    const { creditsRemaining, creditsSpent } = await accrueDictationSeconds(
      uid,
      durationSeconds,
      DICTATION_SECONDS_PER_CREDIT
    );
    // Only logged once a credit is actually spent — a banking-only tick
    // hasn't "spent" anything yet, and logUsageEvent's history feed only
    // makes sense for real spends (mirrors its existing chat/import usage).
    if (creditsSpent > 0 && usedModel) {
      await logUsageEvent(uid, "dictate", "credit", { model: usedModel, tokens: geminiUsage });
    }

    return NextResponse.json({ text, creditsRemaining });
  } catch (err) {
    console.error("dictate api error", err);
    const message = err instanceof Error ? err.message : "Dictation is unavailable right now.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
