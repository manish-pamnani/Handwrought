import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FREE_GENERATIONS_LIMIT, TIER_CREDITS, type Tier } from "@/lib/constants";
import type { GeminiModel, GeminiUsage } from "@/lib/geminiModels";

export type Usage = {
  tier: Tier | null;
  creditsRemaining: number;
  freeGenerationsUsed: number;
  freeGenerationsLimit: number;
};

export type UsageEventType = "chat" | "import";

export type UsageEvent = {
  id: string;
  type: UsageEventType;
  /** which bucket the generation drew from — a paid credit, or a free-tier generation */
  spent: "credit" | "free";
  createdAt: string | null;
  /** real, measured figures from Gemini's own usageMetadata — null for events logged before this was added */
  model: GeminiModel | null;
  promptTokens: number | null;
  outputTokens: number | null;
};

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

  // Paid credits are a one-time-purchase pack, not a subscription that
  // refills itself — creditsRemaining only ever goes down (consumeCredit)
  // or up from a new purchase (grantTier below). No automatic reset, so
  // every credit that can ever be spent has real revenue behind it, no
  // matter how long the account stays active. See grantTier for the
  // purchase side of this.
  const creditsRemaining = typeof data?.creditsRemaining === "number" ? data.creditsRemaining : 0;
  return {
    tier,
    creditsRemaining,
    freeGenerationsUsed,
    freeGenerationsLimit: FREE_GENERATIONS_LIMIT,
  };
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
// `units` lets a single oversized request (a whole-document action on a long
// document) consume more than one "free generation" — see
// app/api/chat/route.ts and app/api/import/route.ts, which compute units
// from request size rather than always spending a flat 1.
export async function incrementUsage(uid: string, units = 1): Promise<number> {
  const ref = getAdminDb().collection("users").doc(uid);
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = typeof snap.data()?.freeGenerationsUsed === "number" ? snap.data()!.freeGenerationsUsed : 0;
    const next = current + units;
    tx.set(ref, { freeGenerationsUsed: FieldValue.increment(units) }, { merge: true });
    return next;
  });
}

// Called by the Paddle webhook once a purchase completes. A credit pack, not
// a subscription refill — this ADDS the tier's credits on top of whatever
// the account already has, so buying again always tops up rather than
// wiping out an unused balance. `tier` is updated to the most recently
// purchased pack, which is display-only now (e.g. which pack badge to show)
// — it doesn't gate anything; only creditsRemaining does.
export async function grantTier(uid: string, tier: Tier): Promise<void> {
  const ref = getAdminDb().collection("users").doc(uid);
  await ref.set({ tier, creditsRemaining: FieldValue.increment(TIER_CREDITS[tier]) }, { merge: true });
}

// Called by the Paddle webhook on an approved refund or chargeback — matches
// the 14-day no-questions-asked refund promised in the Refund Policy.
export async function revokeTier(uid: string): Promise<void> {
  const ref = getAdminDb().collection("users").doc(uid);
  await ref.set({ tier: null, creditsRemaining: 0 }, { merge: true });
}

// Per-generation history backing the /plans-and-credits/usage page — and,
// with `usage` attached, a real dataset for cost modeling. Only called for a
// generation that actually spent something (a paid credit or a free-tier
// slot) — BYOK generations don't touch our credits, so they're not logged
// here (which is also correct for cost analysis: BYOK costs us nothing).
// Fire only after consumeCredit/incrementUsage has succeeded.
export async function logUsageEvent(
  uid: string,
  type: UsageEventType,
  spent: "credit" | "free",
  usage?: { model: GeminiModel; tokens: GeminiUsage }
): Promise<void> {
  const ref = getAdminDb().collection("users").doc(uid).collection("usageEvents").doc();
  await ref.set({
    type,
    spent,
    createdAt: FieldValue.serverTimestamp(),
    ...(usage && {
      model: usage.model,
      promptTokens: usage.tokens.promptTokens,
      outputTokens: usage.tokens.outputTokens,
    }),
  });
}

export async function getUsageEvents(uid: string, limit = 50): Promise<UsageEvent[]> {
  const snap = await getAdminDb()
    .collection("users")
    .doc(uid)
    .collection("usageEvents")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.() as Date | undefined;
    return {
      id: doc.id,
      type: data.type === "import" ? "import" : "chat",
      spent: data.spent === "free" ? "free" : "credit",
      createdAt: createdAt ? createdAt.toISOString() : null,
      model: typeof data.model === "string" ? (data.model as GeminiModel) : null,
      promptTokens: typeof data.promptTokens === "number" ? data.promptTokens : null,
      outputTokens: typeof data.outputTokens === "number" ? data.outputTokens : null,
    };
  });
}
