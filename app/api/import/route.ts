import { NextResponse } from "next/server";
import WordExtractor from "word-extractor";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUsage, incrementUsage, consumeCredit } from "@/lib/serverCredits";
import {
  FREE_GENERATIONS_LIMIT,
  FREE_TIER_MAX_IMPORT_BYTES,
  FREE_TIER_MAX_IMPORT_OUTPUT_TOKENS,
  FREE_TIER_RATE_LIMIT_PER_HOUR,
} from "@/lib/constants";
import { callGeminiWithRotation, type GeminiModel } from "@/lib/geminiModels";
import { verifyAppCheck } from "@/lib/appCheck";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "md"]);
// PDF and .docx are sent to Gemini as native documents — it actually reads
// the page layout, so it can tell a heading from a code block from body
// text instead of us guessing with regexes. Confirmed .docx works the same
// way as PDF (tested against a real .docx, correct extraction). Legacy .doc
// does NOT: tested against a real .doc file and Gemini hallucinated
// (misread it as an image, returned nonsense) — its OLE binary format isn't
// one Gemini's document understanding supports, so .doc gets its text
// extracted locally first and Gemini only reconstructs structure from that.
const NATIVE_DOCUMENT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// Raw extraction has no markdown/HTML meaning — but the imported text still
// ends up as the editor's markdown *source*. Without escaping, a code sample
// containing a literal "<h2>...</h2>" or "# " gets reinterpreted as real
// structure (an actual heading, an actual DOM element) instead of showing as
// the plain text it is. Only genuine .md imports skip this, since markdown
// syntax there is intentional.
function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([#*_`~[\]|])/g, "\\$1")
    .replace(/^(\s{0,3})([-+]|\d+[.)])(\s)/gm, "$1\\$2$3");
}

// Plain .txt extraction comes back wrapped at each visual line, not at real
// paragraph boundaries — collapse those into flowing paragraphs so the
// import doesn't look choppy once it lands in the editor.
function toParagraphs(rawText: string): string {
  const blocks = rawText
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean);

  const counts = new Map<string, number>();
  for (const block of blocks) counts.set(block, (counts.get(block) ?? 0) + 1);
  const deduped = blocks.filter((block) => !(block.length < 120 && (counts.get(block) ?? 0) > 1));

  return deduped.map(escapeMarkdown).join("\n\n");
}

const DOCUMENT_TO_MARKDOWN_PROMPT =
  "Convert this document into clean Markdown for a text editor. Reproduce the actual text " +
  'content verbatim — do not summarize, shorten, or invent anything. Use real Markdown ' +
  'structure: "# " for the title (if any), "## "/"### " for section headings, "- " or "1. " for ' +
  "lists. Wrap any code sample, JSX, HTML snippet, or command-line example in a fenced code " +
  "block (triple backticks) so it renders as code rather than as document structure. Skip " +
  "running headers/footers, page numbers, site navigation, and cookie/consent banners — " +
  "anything that repeats on every page and isn't part of the actual content. Output only the " +
  "Markdown, nothing else.";

const TEXT_CLEANUP_PROMPT =
  "The following is raw text extracted from a legacy .doc file — all original formatting is " +
  "gone, so headings, code blocks, and lists are currently indistinguishable from body text. " +
  'Reconstruct clean Markdown from it: infer real headings from short standalone lines that ' +
  'read like titles and mark them with "# "/"## "/"### "; wrap any code sample, JSX, HTML ' +
  'snippet, or command-line example in a fenced code block (triple backticks); use "- " or ' +
  '"1. " for lists where the text implies one. Reproduce the actual wording verbatim — do not ' +
  "summarize, shorten, or invent anything. Output only the Markdown, nothing else, and don't " +
  "wrap your entire response in one outer code fence.";

async function callGemini(
  apiKey: string,
  model: GeminiModel,
  systemPrompt: string,
  userPart: object,
  maxOutputTokens?: number
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [userPart] }],
        ...(maxOutputTokens && { generationConfig: { maxOutputTokens } }),
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
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
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
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      { error: "Unsupported file type — upload a PDF, Word doc, or text file." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "That file is too large — max 10MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // .txt/.md: free, local, instant — no AI, no credit. Plain text has no
  // structure to lose in the first place, so there's nothing for Gemini to
  // meaningfully add here.
  if (extension === "txt" || extension === "md") {
    const text = extension === "md" ? buffer.toString("utf-8").trim() : toParagraphs(buffer.toString("utf-8"));
    if (!text.trim()) {
      return NextResponse.json(
        { error: "Couldn't find any text in that file." },
        { status: 400 }
      );
    }
    return NextResponse.json({ text });
  }

  // PDF and Word (.doc/.docx): all three go through Gemini for real
  // structural understanding, and all three cost 1 credit — a real model
  // call happens either way, so the cost/tiering mirrors /api/chat exactly:
  // BYOK is unlimited, shared-key guests spend a free generation, and
  // out-of-credit guests get the same credits_exhausted signal the paywall
  // already knows how to handle.
  const userKeyRaw = formData?.get("apiKey");
  const userKey = typeof userKeyRaw === "string" && userKeyRaw.trim() ? userKeyRaw.trim() : null;

  let apiKey: string;
  let creditsRemaining: number | null = null;
  let shouldIncrementUsage = false;
  let shouldConsumeCredit = false;
  let freeTierUnits = 1;

  if (userKey) {
    apiKey = userKey;
  } else {
    const devFallback = process.env.NODE_ENV !== "production" ? process.env.GEMINI_API_KEY : undefined;
    const sharedKey = process.env.GEMINI_SHARED_API_KEY ?? devFallback ?? null;
    if (!sharedKey) {
      return NextResponse.json(
        { error: "Import is temporarily unavailable. Add your own Gemini API key in Settings to continue." },
        { status: 503 }
      );
    }

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
      // Same model as /api/chat's free-tier branch: a large file isn't
      // rejected or truncated — it's imported in full, it just costs more
      // of the guest's 5 free units, proportional to size. Paid tiers and
      // BYOK keep the full 10MB, never metered by size.
      const remaining = usage.freeGenerationsLimit - usage.freeGenerationsUsed;
      freeTierUnits = Math.max(1, Math.ceil(file.size / FREE_TIER_MAX_IMPORT_BYTES));
      if (freeTierUnits > remaining) {
        return NextResponse.json(
          {
            error: `This file needs about ${freeTierUnits} free generations' worth of size — you have ${remaining} left. Try a smaller file, or upgrade — paid credits are flat, 1 credit per import no matter the size.`,
            code: "insufficient_free_units",
            unitsNeeded: freeTierUnits,
            remaining,
          },
          { status: 402 }
        );
      }

      const allowed = await checkRateLimit("free_generation", getClientIp(request), FREE_TIER_RATE_LIMIT_PER_HOUR);
      if (!allowed) {
        return NextResponse.json(
          { error: "Too many free generations from this network right now — try again later, or upgrade for uninterrupted access." },
          { status: 429 }
        );
      }

      apiKey = sharedKey;
      shouldIncrementUsage = true;
      creditsRemaining = remaining;
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

  const maxOutputTokens = shouldIncrementUsage ? FREE_TIER_MAX_IMPORT_OUTPUT_TOKENS * freeTierUnits : undefined;

  let markdown: string;
  try {
    if (extension === "doc") {
      const extractor = new WordExtractor();
      const doc = await extractor.extract(buffer);
      const rawText = doc.getBody();
      markdown = await callGeminiWithRotation((m) =>
        callGemini(apiKey, m, TEXT_CLEANUP_PROMPT, { text: rawText }, maxOutputTokens)
      );
    } else {
      const mimeType = NATIVE_DOCUMENT_MIME[extension];
      const base64 = buffer.toString("base64");
      markdown = await callGeminiWithRotation((m) =>
        callGemini(
          apiKey,
          m,
          DOCUMENT_TO_MARKDOWN_PROMPT,
          { inline_data: { mime_type: mimeType, data: base64 } },
          maxOutputTokens
        )
      );
    }
  } catch (err) {
    console.error("import: gemini error", err);
    return NextResponse.json({ error: "Couldn't read that file — try again in a moment." }, { status: 502 });
  }

  if (shouldConsumeCredit) {
    creditsRemaining = await consumeCredit(uid);
  } else if (shouldIncrementUsage) {
    const newCount = await incrementUsage(uid, freeTierUnits);
    creditsRemaining = Math.max(0, FREE_GENERATIONS_LIMIT - newCount);
  }

  if (!markdown.trim()) {
    return NextResponse.json(
      { error: "Couldn't find any text in that file — it might be a scanned image." },
      { status: 400 }
    );
  }

  return NextResponse.json({ text: markdown.trim(), creditsRemaining });
}
