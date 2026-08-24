import {
  EventName,
  type AdjustmentCreatedEvent,
  type AdjustmentUpdatedEvent,
  type EventEntity,
  type TransactionCompletedEvent,
} from "@paddle/paddle-node-sdk";
import { getPaddleInstance } from "@/lib/paddleServer";
import { TIER_PRICE_IDS, type Tier } from "@/lib/constants";
import { grantTier, revokeTier } from "@/lib/serverCredits";

/**
 * Paddle delivers at-least-once and retries the same event.eventId until we
 * return 2xx, so every handler here must be idempotent. grantTier/revokeTier's
 * Firestore `set(..., { merge: true })` with the same values is naturally
 * idempotent — no ledger needed for these single writes.
 */
export async function processEvent(event: EventEntity): Promise<void> {
  switch (event.eventType) {
    case EventName.TransactionCompleted:
      return handleTransactionCompleted(event);
    case EventName.AdjustmentCreated:
    case EventName.AdjustmentUpdated:
      return handleAdjustment(event);
    default:
      // Subscribed to events we don't handle yet. No-op rather than throw.
      return;
  }
}

function tierForPriceId(priceId: string): Tier | null {
  return (Object.keys(TIER_PRICE_IDS) as Tier[]).find((tier) => TIER_PRICE_IDS[tier] === priceId) ?? null;
}

async function handleTransactionCompleted(event: TransactionCompletedEvent): Promise<void> {
  const { data } = event;

  const purchasedTier = data.items.map((item) => tierForPriceId(item.price?.id ?? "")).find(Boolean) ?? null;
  if (!purchasedTier) return;

  // The Firebase uid is threaded through as custom_data when the buyer is
  // signed in (see app/checkout/page.tsx). Guest checkouts (no uid) have no
  // account to grant access to yet — see the TODO below.
  const firebaseUid = data.customData?.firebaseUid;
  if (typeof firebaseUid !== "string" || !firebaseUid) {
    console.warn(
      `transaction.completed (${data.id}) purchased the $${purchasedTier} tier but carried no firebaseUid in custom_data — cannot grant access automatically. Customer email: ${data.customerId ?? "unknown"}.`
    );
    // TODO: guest-checkout recovery. Options: look up the Paddle customer's
    // email (paddle.customers.get(data.customerId)) and match/link it to a
    // Firebase account by email once one exists, or email the buyer a claim
    // link. Not implemented — out of scope for the initial signed-in flow.
    return;
  }

  await grantTier(firebaseUid, purchasedTier);
}

// A refund or chargeback revokes the tier back to null, matching the 14-day
// no-questions-asked promise in the Refund Policy. `status` moves through
// pending_approval -> approved (or rejected) — only act once approved, since
// AdjustmentCreated can fire before that's decided and AdjustmentUpdated
// fires again when it is. `action` also covers chargeback_reverse etc.; only
// 'refund' and 'chargeback' should ever revoke access.
async function handleAdjustment(event: AdjustmentCreatedEvent | AdjustmentUpdatedEvent): Promise<void> {
  const { data } = event;
  if (data.status !== "approved") return;
  if (data.action !== "refund" && data.action !== "chargeback") return;

  const transaction = await getPaddleInstance().transactions.get(data.transactionId);

  const refundedTier = transaction.items.map((item) => tierForPriceId(item.price?.id ?? "")).find(Boolean) ?? null;
  if (!refundedTier) return;

  const firebaseUid = transaction.customData?.firebaseUid;
  if (typeof firebaseUid !== "string" || !firebaseUid) {
    console.warn(
      `${data.action} (adjustment ${data.id}, transaction ${data.transactionId}) refunded the $${refundedTier} tier but the transaction carried no firebaseUid in custom_data — cannot revoke access automatically.`
    );
    return;
  }

  await revokeTier(firebaseUid);
}
