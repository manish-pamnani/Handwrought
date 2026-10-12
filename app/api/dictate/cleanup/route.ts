import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUsage } from "@/lib/serverCredits";
import { callGeminiWithRotation, extractGeminiUsage, type GeminiModel, type GeminiUsage } from "@/lib/geminiModels";

export const runtime = "nodejs";

const CLEANUP_SYSTEM_PROMPT =
  "You are an expert real-time voice dictation cleanup engine. " +
  "Rewrite the transcribed spoken utterance as clean, publication-ready prose.\n\n" +
  "STRICT RULES:\n" +
  '1. Eliminate verbal fillers: "um", "uh", "er", "like" (only when filler), "you know", "I mean", "so basically".\n' +
  '2. Eliminate false starts, stutters, and immediate word or phrase repeats (e.g. "instead of instead of" -> "instead of").\n' +
  "3. Keep self-corrections: retain the phrase the speaker settled on and discard the abandoned false start.\n" +
  "4. Correct punctuation, sentence capitalization, and contractions.\n" +
  "5. PRESERVE CONTENT: Do NOT summarize, drop substantive ideas, paraphrase unnecessarily, or add commentary.\n" +
  "6. Output ONLY the cleaned text. Do not include quotes, preamble, or explanations.";

async function callGeminiCleanup(
  apiKey: string,
  model: GeminiModel,
  text: string,
  contextBefore?: string
): Promise<{ text: string; usage: GeminiUsage }> {
  const parts: { text: string }[] = [];
  if (contextBefore && contextBefore.trim().length > 0) {
    parts.push({ text: `Preceding context: "${contextBefore.slice(-300)}"\n` });
  }
  parts.push({ text: `Raw transcription: "${text}"` });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: CLEANUP_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 600,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const err = new Error(`Gemini cleanup request failed (${res.status}): ${errText}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const cleanedText =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim() ?? "";
  return { text: cleanedText, usage: extractGeminiUsage(data) };
}

export async function POST(request: Request) {
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

  const usage = await getUsage(uid);
  if (!usage.tier) {
    return NextResponse.json({ error: "Paid plan required", code: "paid_feature" }, { status: 402 });
  }

  const body = await request.json().catch(() => null);
  const rawText = typeof body?.text === "string" ? body.text.trim() : "";
  const contextBefore = typeof body?.contextBefore === "string" ? body.contextBefore : undefined;

  if (!rawText) {
    return NextResponse.json({ cleaned: "" });
  }

  const devFallback = process.env.NODE_ENV !== "production" ? process.env.GEMINI_API_KEY : undefined;
  const sharedKey = process.env.GEMINI_SHARED_API_KEY ?? devFallback ?? null;
  if (!sharedKey) {
    // If Gemini key is unavailable, fall back to returning raw text rather than breaking dictation
    return NextResponse.json({ cleaned: rawText });
  }

  try {
    const { text: cleaned } = await callGeminiWithRotation((model) =>
      callGeminiCleanup(sharedKey, model, rawText, contextBefore)
    );
    return NextResponse.json({ cleaned: cleaned || rawText });
  } catch (err) {
    console.error("dictate cleanup error, returning raw text:", err);
    return NextResponse.json({ cleaned: rawText });
  }
}
