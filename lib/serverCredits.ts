import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FREE_GENERATIONS_LIMIT, TIER_CREDITS, type Tier } from "@/lib/constants";
import type { GeminiModel, GeminiUsage } from "@/lib/geminiModels";

export type Usage = {
  tier: Tier | null;
  creditsRemaining: number;
  freeGenerationsUsed: number;
  freeGenerationsLimit: number;
  /** seconds of dictation audio accrued toward the next credit spend — see accrueDictationSeconds */
  dictationSecondsBanked: number;
};

export type UsageEventType = "chat" | "import" | "dictate";

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
  const dictationSecondsBanked = typeof data?.dictationSecondsBanked === "number" ? data.dictationSecondsBanked : 0;

  if (!tier) {
    return {
      tier: null,
      creditsRemaining: Math.max(0, FREE_GENERATIONS_LIMIT - freeGenerationsUsed),
      freeGenerationsUsed,
      freeGenerationsLimit: FREE_GENERATIONS_LIMIT,
      dictationSecondsBanked,
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
    dictationSecondsBanked,
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

// Voice dictation isn't charged 1-credit-per-click like chat/import — a
// short dictation shouldn't cost the same as a full document rewrite.
// Instead, every successful dictation adds its clip length to a running
// bank, and only once the bank crosses `secondsPerCredit` does a real
// credit actually get spent, with the remainder carried forward. Reads
// current `creditsRemaining` inside the same transaction (rather than
// trusting a pre-flight check the caller already did), so this can never
// spend more credits than the account actually has, even under concurrent
// requests — mirrors consumeCredit's Math.max(0, ...) floor.
export async function accrueDictationSeconds(
  uid: string,
  seconds: number,
  secondsPerCredit: number
): Promise<{ creditsRemaining: number; dictationSecondsBanked: number; creditsSpent: number }> {
  const ref = getAdminDb().collection("users").doc(uid);
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const currentBank = typeof data?.dictationSecondsBanked === "number" ? data.dictationSecondsBanked : 0;
    const currentCredits = typeof data?.creditsRemaining === "number" ? data.creditsRemaining : 0;

    const totalBank = currentBank + seconds;
    const creditsWanted = Math.floor(totalBank / secondsPerCredit);
    const creditsSpent = Math.min(creditsWanted, currentCredits);
    const nextBank = totalBank - creditsSpent * secondsPerCredit;
    const nextCredits = currentCredits - creditsSpent;

    tx.set(ref, { dictationSecondsBanked: nextBank, creditsRemaining: nextCredits }, { merge: true });
    return { creditsRemaining: nextCredits, dictationSecondsBanked: nextBank, creditsSpent };
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
//
// Paddle delivers webhooks at-least-once and retries the same transaction
// until it gets a 2xx (see lib/paddleWebhookHandlers.ts) — with a flat `set`
// that retry was harmless (same end value either way), but FieldValue.increment
// is NOT naturally idempotent: an unguarded retry would grant credits twice
// for one payment. `transactionId` (Paddle's transaction.completed data.id)
// guards against that — the increment and the "already processed" marker
// are written atomically, so a replayed event is a no-op the second time.
export async function grantTier(uid: string, tier: Tier, transactionId: string): Promise<void> {
  const userRef = getAdminDb().collection("users").doc(uid);
  const processedRef = getAdminDb().collection("paddleProcessedTransactions").doc(transactionId);
  await getAdminDb().runTransaction(async (tx) => {
    const processedSnap = await tx.get(processedRef);
    if (processedSnap.exists) return; // already granted for this transaction — Paddle retry, no-op
    tx.set(userRef, { tier, creditsRemaining: FieldValue.increment(TIER_CREDITS[tier]) }, { merge: true });
    tx.set(processedRef, { uid, tier, grantedAt: FieldValue.serverTimestamp() });
  });
}

// Called by the Paddle webhook on an approved refund or chargeback — matches
// the 14-day no-questions-asked refund promised in the Refund Policy.
//
// Credits stack across purchases now (see grantTier above) — refunding one
// $6.75/100-credit purchase must only deduct those 100 credits, not wipe the
// account's whole accumulated balance the way a flat `set` to 0 used to.
// `tier` (display-only, doesn't gate anything) is left alone unless the
// deduction brings the balance to 0, in which case there's nothing left to
// badge as a pack — falls back to showing "Free".
//
// Same idempotency shape as grantTier: Paddle retries adjustment webhooks
// at-least-once, and FieldValue.increment(-...) is not naturally idempotent
// — `adjustmentId` guards a replay from deducting twice for one refund.
export async function revokeTier(uid: string, tier: Tier, adjustmentId: string): Promise<void> {
  const userRef = getAdminDb().collection("users").doc(uid);
  const processedRef = getAdminDb().collection("paddleProcessedAdjustments").doc(adjustmentId);
  await getAdminDb().runTransaction(async (tx) => {
    const processedSnap = await tx.get(processedRef);
    if (processedSnap.exists) return; // already revoked for this adjustment — Paddle retry, no-op

    const userSnap = await tx.get(userRef);
    const current = typeof userSnap.data()?.creditsRemaining === "number" ? userSnap.data()!.creditsRemaining : 0;
    const next = Math.max(0, current - TIER_CREDITS[tier]);
    tx.set(userRef, { creditsRemaining: next, ...(next === 0 && { tier: null }) }, { merge: true });
    tx.set(processedRef, { uid, tier, revokedAt: FieldValue.serverTimestamp() });
  });
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
