import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FREE_GENERATIONS_LIMIT, TIER_CREDITS, type Tier } from "@/lib/constants";

export type Usage = {
  tier: Tier | null;
  creditsRemaining: number;
  freeGenerationsUsed: number;
  freeGenerationsLimit: number;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isTier(value: unknown): value is Tier {
  return value === "9" || value === "19" || value === "29";
}

export async function getUsage(uid: string): Promise<Usage> {
  const ref = getAdminDb().collection("users").doc(uid);
  const snap = await ref.get();
  const data = snap.data();
  const freeGenerationsUsed = typeof data?.freeGenerationsUsed === "number" ? data.freeGenerationsUsed : 0;
  const tier = isTier(data?.tier) ? data.tier : null;

  if (!tier) {
    return {
      tier: null,
      creditsRemaining: Math.max(0, FREE_GENERATIONS_LIMIT - freeGenerationsUsed),
      freeGenerationsUsed,
      freeGenerationsLimit: FREE_GENERATIONS_LIMIT,
    };
  }

  // Paid tiers are a one-time purchase, not a recurring charge — credits just
  // refresh every 30 days, forever. Lazy reset-on-read means no cron job.
  const resetAt = typeof data?.creditsResetAt === "string" ? Date.parse(data.creditsResetAt) : NaN;
  if (!Number.isFinite(resetAt) || Date.now() >= resetAt) {
    const creditsResetAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
    await ref.set({ creditsRemaining: TIER_CREDITS[tier], creditsResetAt }, { merge: true });
    return { tier, creditsRemaining: TIER_CREDITS[tier], freeGenerationsUsed, freeGenerationsLimit: FREE_GENERATIONS_LIMIT };
  }

  const creditsRemaining = typeof data?.creditsRemaining === "number" ? data.creditsRemaining : TIER_CREDITS[tier];
  return { tier, creditsRemaining, freeGenerationsUsed, freeGenerationsLimit: FREE_GENERATIONS_LIMIT };
}

// Transactional decrement so two rapid-fire requests from the same paid user
// can't both slip through while `creditsRemaining` is still stale.
export async function consumeCredit(uid: string): Promise<number> {
  const ref = getAdminDb().collection("users").doc(uid);
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = typeof snap.data()?.creditsRemaining === "number" ? snap.data()!.creditsRemaining : 0;
    const next = Math.max(0, current - 1);
    tx.set(ref, { creditsRemaining: next }, { merge: true });
    return next;
  });
}

// Transactional increment so two rapid-fire requests from the same guest
// can't both slip through while `freeGenerationsUsed` is still stale.
export async function incrementUsage(uid: string): Promise<number> {
  const ref = getAdminDb().collection("users").doc(uid);
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = typeof snap.data()?.freeGenerationsUsed === "number" ? snap.data()!.freeGenerationsUsed : 0;
    const next = current + 1;
    tx.set(ref, { freeGenerationsUsed: FieldValue.increment(1) }, { merge: true });
    return next;
  });
}

// Called by the Paddle webhook once a purchase completes.
export async function grantTier(uid: string, tier: Tier): Promise<void> {
  const ref = getAdminDb().collection("users").doc(uid);
  const creditsResetAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
  await ref.set({ tier, creditsRemaining: TIER_CREDITS[tier], creditsResetAt }, { merge: true });
}

// Called by the Paddle webhook on an approved refund or chargeback — matches
// the 14-day no-questions-asked refund promised in the Refund Policy.
export async function revokeTier(uid: string): Promise<void> {
  const ref = getAdminDb().collection("users").doc(uid);
  await ref.set({ tier: null, creditsRemaining: 0 }, { merge: true });
}
