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

// Launch early-bird discount — 25% off, capped at the first 200 redemptions,
// restricted to the three tier prices above (see scripts/create-early-bird-discount.ts).
// Same credits, same list price for everyone after the 200 — a real,
// time/quantity-limited scarcity discount, not a permanent price or credit
// change. Passed as Paddle.Checkout.open()'s discountId so it's applied
// automatically; Paddle's own usage_limit stops it once 200 are redeemed, no
// app-side tracking needed. Live ID still empty — create it against the live
// catalog the same way before going live, same pattern as TIER_PRICE_IDS.
const SANDBOX_EARLY_BIRD_DISCOUNT_ID = "dsc_01m1b66xvvykwervayxbjztfx2";
const LIVE_EARLY_BIRD_DISCOUNT_ID = "";
export const EARLY_BIRD_DISCOUNT_ID =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? LIVE_EARLY_BIRD_DISCOUNT_ID : SANDBOX_EARLY_BIRD_DISCOUNT_ID;

// Explicit go-live switch for the Paddle checkout UI, separate from having
// price IDs populated — Paddle also requires the sending domain to be
// verified/approved in the dashboard before checkout can safely go live.
// Unset (or anything other than "true"), the checkout page always falls back
// to the waitlist form. Flip to "true" in Vercel once domain verification is
// done and the live env vars below are filled in.
export const PADDLE_CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_PADDLE_CHECKOUT_ENABLED === "true";

export const TIERS: Tier[] = ["9", "19", "29"];

// Requires the explicit go-live switch above *and* real price IDs for every
// tier — guards against shipping a broken checkout if live IDs haven't been
// populated yet. Single source of truth shared by the /checkout page and the
// PlansModal so both fall back to the waitlist identically.
export const CHECKOUT_READY = PADDLE_CHECKOUT_ENABLED && TIERS.every((tier) => TIER_PRICE_IDS[tier]);

// Free generations any guest gets against HandWrought's shared Gemini key
// before being asked to upgrade — in units, not flat request count. A normal
// request costs 1 unit; an oversized one (a whole-document action on a long
// document) costs proportionally more, computed from request size against
// FREE_TIER_MAX_CHARS/FREE_TIER_MAX_IMPORT_BYTES below. See lib/serverCredits.ts.
export const FREE_GENERATIONS_LIMIT = 5;

// Abuse guards on the free-tier path specifically (BYOK and paid tiers are
// unaffected — they either cost the user their own key/quota or already
// paid, always sent in full, never metered by size). A free generation is
// otherwise unbounded in size, and a fresh anonymous session
// (signInAnonymously, no friction) gets a fresh 5 free generations —
// without these, the free tier is a scriptable, effectively unlimited cost
// sink. See app/api/chat/route.ts, app/api/import/route.ts.
//
// Content is never truncated or rejected outright for being oversized — a
// free-tier request always gets sent to Gemini in full and gets a complete,
// untruncated result. What scales instead is how many of the 5 free units
// it costs: ceil(size / this constant), minimum 1. A request that would cost
// more units than the guest has left is declined up front, with the exact
// numbers, before anything is sent — not silently degraded.
export const FREE_TIER_MAX_CHARS = 4000; // ~700 words of document+message content = 1 free-tier unit
export const FREE_TIER_MAX_IMPORT_BYTES = 1 * 1024 * 1024; // 1MB of file = 1 free-tier unit, vs. 10MB for paid/BYOK
export const FREE_TIER_RATE_LIMIT_PER_HOUR = 20; // per IP, backstop against session-reset farming
// Output tokens cost 5-8x input tokens across the Gemini lineup — this is
// the per-unit output ceiling, scaled by the same units count as the input
// side (units * this value) so a bigger, more-expensive request also gets
// enough headroom to produce a complete result, not a cut-off one.
export const FREE_TIER_MAX_OUTPUT_TOKENS = 1200; // ~900 words, per unit
export const FREE_TIER_MAX_IMPORT_OUTPUT_TOKENS = 3500; // per unit — imports reproduce the source content, not a short reply

// continue-sentence feature disabled, collides with Expand
// export const CONTINUE_SENTENCE_INSTRUCTION =
//   "Continue the sentence or paragraph naturally from exactly where the cursor is, matching the existing tone and style. Add roughly one short sentence to complete the current thought, then stop — don't start a new unrelated idea.";
