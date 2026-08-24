// One-time script to (re)seed the 3-tier Lifetime Access pricing in the Paddle
// sandbox catalog — $9/100 credits, $19/200 credits, $29/400 credits per month,
// each a one-time purchase (no billing_cycle). Reuses the existing "Handwrought
// Lifetime Access" product from the earlier single-price attempt and archives
// its stale $9.99 price.
// Run with: npx tsx --env-file=.env.local scripts/seed-paddle-tiers.ts
// Requires PADDLE_API_KEY (sandbox) in the environment.

import { Environment, Paddle } from "@paddle/paddle-node-sdk";

type Tier = "9" | "19" | "29";

const paddle = new Paddle(process.env.PADDLE_API_KEY!, { environment: Environment.sandbox });

const LIFETIME_ACCESS_PRODUCT_ID = "pro_01kys9wnmfdqbfg2mcq0e1xb74";
const STALE_PRICE_ID = "pri_01kys9wp1gm138vwyy9xx8qr4f";

const TIER_CREDITS: Record<Tier, number> = { "9": 100, "19": 200, "29": 400 };
const TIER_AMOUNTS_CENTS: Record<Tier, string> = { "9": "900", "19": "1900", "29": "2900" };

async function seed() {
  await paddle.prices.update(STALE_PRICE_ID, { status: "archived" });

  const priceIds: Record<Tier, string> = { "9": "", "19": "", "29": "" };
  for (const tier of Object.keys(TIER_AMOUNTS_CENTS) as Tier[]) {
    const price = await paddle.prices.create({
      productId: LIFETIME_ACCESS_PRODUCT_ID,
      description: `Lifetime Access — $${tier} tier (${TIER_CREDITS[tier as Tier]} credits/month)`,
      unitPrice: { amount: TIER_AMOUNTS_CENTS[tier as Tier], currencyCode: "USD" },
      customData: { tier },
    });
    priceIds[tier as Tier] = price.id;
  }

  console.log(JSON.stringify({ priceIds }, null, 2));
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
