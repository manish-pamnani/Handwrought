export const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Hindi"];

export const TONES = ["Professional", "Casual", "Persuasive", "Friendly", "Confident", "Formal"];

// Paddle catalog IDs are environment-scoped (sandbox and live are fully separate
// accounts) — see scripts/seed-paddle-catalog.ts (sandbox) and
// scripts/migrate-catalog-to-live.ts (live) for the full ID mapping.
export const LIFETIME_ACCESS_PRICE_ID =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? "pri_01kzb4s7xtpn9yp5sz6nzxjx23" // live
    : "pri_01kys9wp1gm138vwyy9xx8qr4f"; // sandbox
export const EARLY_BIRD_DISCOUNT_CODE = "EARLYBIRD50";

// Free generations any guest gets against HandWrought's shared Gemini key
// before being offered the degrade-vs-upgrade choice. See lib/serverCredits.ts.
export const FREE_GENERATIONS_LIMIT = 5;

// continue-sentence feature disabled, collides with Expand
// export const CONTINUE_SENTENCE_INSTRUCTION =
//   "Continue the sentence or paragraph naturally from exactly where the cursor is, matching the existing tone and style. Add roughly one short sentence to complete the current thought, then stop — don't start a new unrelated idea.";
