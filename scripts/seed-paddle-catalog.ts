// One-time script to seed the Paddle sandbox catalog for Handwrought.
// Run with: npx tsx scripts/seed-paddle-catalog.ts
// Requires PADDLE_API_KEY in the environment (sandbox key with product.write, price.write, discount.write scopes).

import { Environment, Paddle } from "@paddle/paddle-node-sdk";

const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment: Environment.sandbox,
});

const TAX_CATEGORY = "saas" as const;

async function seed() {
  // ---- Tier 1: BYOK Lifetime Access ----
  const lifetimeProduct = await paddle.products.create({
    name: "Handwrought Lifetime Access",
    taxCategory: TAX_CATEGORY,
    description:
      "One-time purchase. Unlocks the full Handwrought editor (change tone, find synonyms, improve/rephrase, shorten, expand, fix grammar) for unlimited use with your own Gemini API key.",
  });

  const lifetimePrice = await paddle.prices.create({
    productId: lifetimeProduct.id,
    description: "Lifetime Access - Regular (USD)",
    unitPrice: { amount: "999", currencyCode: "USD" }, // $9.99
    unitPriceOverrides: [
      { countryCodes: ["GB"], unitPrice: { amount: "799", currencyCode: "GBP" } }, // £7.99
      { countryCodes: ["IE"], unitPrice: { amount: "899", currencyCode: "EUR" } }, // €8.99
      { countryCodes: ["AU"], unitPrice: { amount: "1499", currencyCode: "AUD" } }, // A$14.99
    ],
  });

  const earlybirdDiscount = await paddle.discounts.create({
    description: "Early bird - 50% off Lifetime Access, first 150 buyers",
    type: "percentage",
    amount: "50",
    code: "EARLYBIRD50",
    usageLimit: 150,
    restrictTo: [lifetimePrice.id],
    enabledForCheckout: true,
  });

  // ---- Tier 2a: Managed AI ----
  const managedAiProduct = await paddle.products.create({
    name: "Handwrought Managed AI",
    taxCategory: TAX_CATEGORY,
    description: "Fully managed AI editing, no API key required. 500 generations/month.",
  });

  const managedAiMonthly = await paddle.prices.create({
    productId: managedAiProduct.id,
    description: "Managed AI - Monthly (USD)",
    unitPrice: { amount: "1499", currencyCode: "USD" }, // $14.99
    billingCycle: { interval: "month", frequency: 1 },
    unitPriceOverrides: [
      { countryCodes: ["GB"], unitPrice: { amount: "1199", currencyCode: "GBP" } }, // £11.99
      { countryCodes: ["IE"], unitPrice: { amount: "1399", currencyCode: "EUR" } }, // €13.99
      { countryCodes: ["AU"], unitPrice: { amount: "2299", currencyCode: "AUD" } }, // A$22.99
    ],
  });

  const managedAiAnnual = await paddle.prices.create({
    productId: managedAiProduct.id,
    description: "Managed AI - Annual (USD)",
    unitPrice: { amount: "14999", currencyCode: "USD" }, // $149.99 (~2 months free)
    billingCycle: { interval: "year", frequency: 1 },
    unitPriceOverrides: [
      { countryCodes: ["GB"], unitPrice: { amount: "11999", currencyCode: "GBP" } }, // £119.99
      { countryCodes: ["IE"], unitPrice: { amount: "13999", currencyCode: "EUR" } }, // €139.99
      { countryCodes: ["AU"], unitPrice: { amount: "22999", currencyCode: "AUD" } }, // A$229.99
    ],
  });

  // ---- Tier 2b: Managed AI Plus ----
  const managedAiPlusProduct = await paddle.products.create({
    name: "Handwrought Managed AI Plus",
    taxCategory: TAX_CATEGORY,
    description: "Fully managed AI editing, no API key required. 1,000 generations/month.",
  });

  const managedAiPlusMonthly = await paddle.prices.create({
    productId: managedAiPlusProduct.id,
    description: "Managed AI Plus - Monthly (USD)",
    unitPrice: { amount: "1999", currencyCode: "USD" }, // $19.99
    billingCycle: { interval: "month", frequency: 1 },
    unitPriceOverrides: [
      { countryCodes: ["GB"], unitPrice: { amount: "1599", currencyCode: "GBP" } }, // £15.99
      { countryCodes: ["IE"], unitPrice: { amount: "1899", currencyCode: "EUR" } }, // €18.99
      { countryCodes: ["AU"], unitPrice: { amount: "3099", currencyCode: "AUD" } }, // A$30.99
    ],
  });

  const managedAiPlusAnnual = await paddle.prices.create({
    productId: managedAiPlusProduct.id,
    description: "Managed AI Plus - Annual (USD)",
    unitPrice: { amount: "19999", currencyCode: "USD" }, // $199.99 (~2 months free)
    billingCycle: { interval: "year", frequency: 1 },
    unitPriceOverrides: [
      { countryCodes: ["GB"], unitPrice: { amount: "15999", currencyCode: "GBP" } }, // £159.99
      { countryCodes: ["IE"], unitPrice: { amount: "18499", currencyCode: "EUR" } }, // €184.99
      { countryCodes: ["AU"], unitPrice: { amount: "30999", currencyCode: "AUD" } }, // A$309.99
    ],
  });

  // ---- Top-up pack ----
  const topupProduct = await paddle.products.create({
    name: "Handwrought Top-up Pack",
    taxCategory: TAX_CATEGORY,
    description: "100 extra AI generations for the current billing month, for Managed AI plan subscribers who hit their cap.",
  });

  const topupPrice = await paddle.prices.create({
    productId: topupProduct.id,
    description: "Top-up Pack - 100 generations (USD)",
    unitPrice: { amount: "299", currencyCode: "USD" }, // $2.99
    unitPriceOverrides: [
      { countryCodes: ["GB"], unitPrice: { amount: "249", currencyCode: "GBP" } }, // £2.49
      { countryCodes: ["IE"], unitPrice: { amount: "279", currencyCode: "EUR" } }, // €2.79
      { countryCodes: ["AU"], unitPrice: { amount: "499", currencyCode: "AUD" } }, // A$4.99
    ],
  });

  console.log(
    JSON.stringify(
      {
        lifetime: {
          productId: lifetimeProduct.id,
          priceId: lifetimePrice.id,
        },
        earlybirdDiscount: {
          id: earlybirdDiscount.id,
          code: earlybirdDiscount.code,
        },
        managedAi: {
          productId: managedAiProduct.id,
          monthlyPriceId: managedAiMonthly.id,
          annualPriceId: managedAiAnnual.id,
        },
        managedAiPlus: {
          productId: managedAiPlusProduct.id,
          monthlyPriceId: managedAiPlusMonthly.id,
          annualPriceId: managedAiPlusAnnual.id,
        },
        topup: {
          productId: topupProduct.id,
          priceId: topupPrice.id,
        },
      },
      null,
      2,
    ),
  );
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
