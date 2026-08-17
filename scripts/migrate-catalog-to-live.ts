// One-time script to migrate the Handwrought Paddle catalog from sandbox to live.
// Reads the current sandbox catalog fresh (not hardcoded) and recreates equivalents in live.
// Run with: npx tsx scripts/migrate-catalog-to-live.ts
// Requires PADDLE_API_KEY (sandbox, read-only use) and PADDLE_API_KEY_LIVE (live, write) in the environment.

import { Environment, Paddle, type CountryCode, type CurrencyCode } from "@paddle/paddle-node-sdk";

const sandbox = new Paddle(process.env.PADDLE_API_KEY!, { environment: Environment.sandbox });
const live = new Paddle(process.env.PADDLE_API_KEY_LIVE!, { environment: Environment.production });

async function main() {
  const productIdMap: Record<string, string> = {};
  const priceIdMap: Record<string, string> = {};

  const sandboxProducts = await sandbox.products.list({ include: ["prices"] });
  for await (const sp of sandboxProducts) {
    if (sp.status !== "active") continue;

    const liveProduct = await live.products.create({
      name: sp.name,
      taxCategory: sp.taxCategory,
      description: sp.description ?? undefined,
    });
    productIdMap[sp.id] = liveProduct.id;

    for (const sPrice of sp.prices ?? []) {
      if (sPrice.status !== "active") continue;

      const livePrice = await live.prices.create({
        productId: liveProduct.id,
        description: sPrice.description,
        unitPrice: {
          amount: sPrice.unitPrice.amount,
          currencyCode: sPrice.unitPrice.currencyCode as CurrencyCode,
        },
        billingCycle: sPrice.billingCycle
          ? { interval: sPrice.billingCycle.interval, frequency: sPrice.billingCycle.frequency }
          : undefined,
        unitPriceOverrides: (sPrice.unitPriceOverrides ?? []).map((ov) => ({
          countryCodes: ov.countryCodes as CountryCode[],
          unitPrice: {
            amount: ov.unitPrice.amount,
            currencyCode: ov.unitPrice.currencyCode as CurrencyCode,
          },
        })),
      });
      priceIdMap[sPrice.id] = livePrice.id;
    }
  }

  const discountIdMap: Record<string, string> = {};
  const sandboxDiscounts = await sandbox.discounts.list();
  for await (const sd of sandboxDiscounts) {
    if (sd.status !== "active") continue;

    const liveRestrictTo = (sd.restrictTo ?? [])
      .map((sandboxPriceId) => priceIdMap[sandboxPriceId])
      .filter((id): id is string => !!id);

    const liveDiscount = await live.discounts.create({
      description: sd.description,
      type: sd.type,
      amount: sd.amount,
      code: sd.code ?? undefined,
      usageLimit: sd.usageLimit ?? undefined,
      restrictTo: liveRestrictTo.length > 0 ? liveRestrictTo : undefined,
      enabledForCheckout: sd.enabledForCheckout,
    });
    discountIdMap[sd.id] = liveDiscount.id;
  }

  console.log(
    JSON.stringify(
      {
        productIdMap,
        priceIdMap,
        discountIdMap,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
