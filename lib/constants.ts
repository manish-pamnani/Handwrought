export const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Hindi"];

export const TONES = ["Professional", "Casual", "Persuasive", "Friendly", "Confident", "Formal"];

// Credits: a one-time purchase that unlocks a monthly-refreshing
// credit allotment, forever — not a recurring subscription charge. See
// lib/serverCredits.ts for the reset logic.
export type Tier = "9" | "19" | "29";

export const TIER_CREDITS: Record<Tier, number> = {
  "9": 100,
  "19": 200,
  "29": 400,
};

// Paddle catalog IDs are environment-scoped (sandbox and live are fully separate
// accounts) — sandbox seeded via scripts/seed-paddle-tiers.ts. Live IDs are
// still empty; populate them the same way against a live Paddle API key before
// flipping NEXT_PUBLIC_PADDLE_ENV to "production".
const SANDBOX_TIER_PRICE_IDS: Record<Tier, string> = {
  "9": "pri_01m0s03e50z45b37ba9hbreygn",
  "19": "pri_01m0s03eez9126bdkv3az4tybf",
  "29": "pri_01m0s03eqj6eyw4a9pw8wd2p7w",
};
const LIVE_TIER_PRICE_IDS: Record<Tier, string> = {
  "9": "pri_01m0vkxytnw0v6fym6b0kmq940",
  "19": "pri_01m0vkxygeb4ckhpbyf0pwpjxy",
  "29": "pri_01m0vkxy5cmwr95ef157f0smwr",
};
export const TIER_PRICE_IDS: Record<Tier, string> =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? LIVE_TIER_PRICE_IDS : SANDBOX_TIER_PRICE_IDS;

// Explicit go-live switch for the Paddle checkout UI, separate from having
// price IDs populated — Paddle also requires the sending domain to be
// verified/approved in the dashboard before checkout can safely go live.
// Unset (or anything other than "true"), the checkout page always falls back
// to the waitlist form. Flip to "true" in Vercel once domain verification is
// done and the live env vars below are filled in.
export const PADDLE_CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_PADDLE_CHECKOUT_ENABLED === "true";

// Free generations any guest gets against HandWrought's shared Gemini key
// before being asked to upgrade. See lib/serverCredits.ts.
export const FREE_GENERATIONS_LIMIT = 5;

// Abuse guards on the free-tier path specifically (BYOK and paid tiers are
// unaffected — they either cost the user their own key/quota or already
// paid). A free generation is otherwise unbounded in size, and a fresh
// anonymous session (signInAnonymously, no friction) gets a fresh 5 free
// generations — without these, the free tier is a scriptable, effectively
// unlimited cost sink. See app/api/chat/route.ts, app/api/import/route.ts.
export const FREE_TIER_MAX_CHARS = 4000; // ~700 words of document+message content per free generation
export const FREE_TIER_MAX_IMPORT_BYTES = 1 * 1024 * 1024; // 1MB, vs. 10MB for paid/BYOK imports
export const FREE_TIER_RATE_LIMIT_PER_HOUR = 20; // per IP, backstop against session-reset farming
// Output tokens cost 5-8x input tokens across the Gemini lineup — capping
// input size alone still leaves a small prompt able to request an
// arbitrarily long response. ~1,200 tokens is roughly 900 words, generous
// for trying the product on a free generation.
export const FREE_TIER_MAX_OUTPUT_TOKENS = 1200;
// Imports reproduce the source document's own content, not an open-ended
// reply — FREE_TIER_MAX_IMPORT_BYTES bounds the file, but a text-dense 1MB
// file (e.g. a plain-text-heavy PDF) can still hold far more actual words
// than the byte cap implies. Bounding output directly, rather than trusting
// file size as a proxy for word count, is what actually caps the worst
// case — generous enough for a genuine multi-page free-trial document.
export const FREE_TIER_MAX_IMPORT_OUTPUT_TOKENS = 3500;

// continue-sentence feature disabled, collides with Expand
// export const CONTINUE_SENTENCE_INSTRUCTION =
//   "Continue the sentence or paragraph naturally from exactly where the cursor is, matching the existing tone and style. Add roughly one short sentence to complete the current thought, then stop — don't start a new unrelated idea.";
