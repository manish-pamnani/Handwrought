// One-time script to create the launch early-bird discount in the Paddle
// sandbox catalog — 25% off, capped at the first 200 redemptions, restricted
// to the three existing credit tier prices ($9/100, $19/200, $29/400). Same
// credits, same list price for everyone after the 200 — this is a real,
// clearly-labeled scarcity discount, not a permanent price/credit change.
// See lib/constants.ts EARLY_BIRD_DISCOUNT_ID for how it's wired into checkout.
//
// Run with: npx tsx --env-file=.env.local scripts/create-early-bird-discount.ts
// Requires PADDLE_API_KEY (sandbox) in the environment.

import { Environment, Paddle } from "@paddle/paddle-node-sdk";

const paddle = new Paddle(process.env.PADDLE_API_KEY!, { environment: Environment.sandbox });

const SANDBOX_TIER_PRICE_IDS = [
  "pri_01m0s03e50z45b37ba9hbreygn", // $9 / 100 credits
  "pri_01m0s03eez9126bdkv3az4tybf", // $19 / 200 credits
  "pri_01m0s03eqj6eyw4a9pw8wd2p7w", // $29 / 400 credits
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
    restrictTo: SANDBOX_TIER_PRICE_IDS,
  });

  console.log(JSON.stringify({ id: discount.id, code: discount.code, usageLimit: discount.usageLimit }, null, 2));
}

create().catch((e) => {
  console.error(e);
  process.exit(1);
});
