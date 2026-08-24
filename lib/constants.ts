export const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Hindi"];

export const TONES = ["Professional", "Casual", "Persuasive", "Friendly", "Confident", "Formal"];

// Lifetime Access: a one-time purchase that unlocks a monthly-refreshing
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
  "9": "",
  "19": "",
  "29": "",
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

export const EARLY_BIRD_DISCOUNT_CODE = "EARLYBIRD50";

// Free generations any guest gets against HandWrought's shared Gemini key
// before being asked to upgrade. See lib/serverCredits.ts.
export const FREE_GENERATIONS_LIMIT = 5;

// continue-sentence feature disabled, collides with Expand
// export const CONTINUE_SENTENCE_INSTRUCTION =
//   "Continue the sentence or paragraph naturally from exactly where the cursor is, matching the existing tone and style. Add roughly one short sentence to complete the current thought, then stop — don't start a new unrelated idea.";
