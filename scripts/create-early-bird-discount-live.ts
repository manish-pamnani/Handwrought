// One-time script to create the launch early-bird discount in the LIVE
// Paddle catalog — mirrors scripts/create-early-bird-discount.ts (sandbox),
// same terms: 25% off, capped at the first 200 redemptions, restricted to
// the three live credit tier prices ($9/100, $19/200, $29/400). Same
// credits, same list price for everyone after the 200 — a real,
// clearly-labeled scarcity discount, not a permanent price/credit change.
// See lib/constants.ts EARLY_BIRD_DISCOUNT_ID for how it's wired into checkout —
// paste the resulting id into LIVE_EARLY_BIRD_DISCOUNT_ID there.
//
// Run with: npx tsx --env-file=.env.local scripts/create-early-bird-discount-live.ts
// Requires PADDLE_API_KEY_LIVE in the environment. This hits the real Paddle
// account — running it twice creates two live discounts, not an update.

import { Environment, Paddle } from "@paddle/paddle-node-sdk";

const paddle = new Paddle(process.env.PADDLE_API_KEY_LIVE!, { environment: Environment.production });

const LIVE_TIER_PRICE_IDS = [
  "pri_01m0vkxytnw0v6fym6b0kmq940", // $9 / 100 credits
  "pri_01m0vkxygeb4ckhpbyf0pwpjxy", // $19 / 200 credits
  "pri_01m0vkxy5cmwr95ef157f0smwr", // $29 / 400 credits
];

async function create() {
  const discount = await paddle.discounts.create({
    description: "Founding Member launch discount — first 200 customers, 25% off, all 3 credit tiers",
    enabledForCheckout: true,
    code: "FOUNDING25",
    type: "percentage",
    amount: "25",
    recur: false,
    usageLimit: 200,
    restrictTo: LIVE_TIER_PRICE_IDS,
  });

  console.log(JSON.stringify({ id: discount.id, code: discount.code, usageLimit: discount.usageLimit }, null, 2));
}

create().catch((e) => {
  console.error(e);
  process.exit(1);
});
