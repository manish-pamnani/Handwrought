import { EventName, type EventEntity, type TransactionCompletedEvent } from "@paddle/paddle-node-sdk";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { LIFETIME_ACCESS_PRICE_ID } from "@/lib/constants";

/**
 * Paddle delivers at-least-once and retries the same event.eventId until we
 * return 2xx, so every handler here must be idempotent. Firestore `set(...,
 * { merge: true })` with the same values is naturally idempotent — no ledger
 * needed for this single write.
 */
export async function processEvent(event: EventEntity): Promise<void> {
  switch (event.eventType) {
    case EventName.TransactionCompleted:
      return handleTransactionCompleted(event);
    default:
      // Subscribed to events we don't handle yet (customer.*, subscription.* —
      // relevant once Tier 2 Managed AI ships). No-op rather than throw.
      return;
  }
}

async function handleTransactionCompleted(event: TransactionCompletedEvent): Promise<void> {
  const { data } = event;

  const boughtLifetimeAccess = data.items.some((item) => item.price?.id === LIFETIME_ACCESS_PRICE_ID);
  if (!boughtLifetimeAccess) return;

  // The Firebase uid is threaded through as custom_data when the buyer is
  // signed in (see app/checkout/page.tsx). Guest checkouts (no uid) have no
  // account to grant access to yet — see the TODO below.
  const firebaseUid = data.customData?.firebaseUid;
  if (typeof firebaseUid !== "string" || !firebaseUid) {
    console.warn(
      `transaction.completed (${data.id}) purchased lifetime access but carried no firebaseUid in custom_data — cannot grant access automatically. Customer email: ${data.customerId ?? "unknown"}.`,
    );
    // TODO: guest-checkout recovery. Options: look up the Paddle customer's
    // email (paddle.customers.get(data.customerId)) and match/link it to a
    // Firebase account by email once one exists, or email the buyer a claim
    // link. Not implemented — out of scope for the initial signed-in flow.
    return;
  }

  const db = getAdminDb();
  await db
    .collection("users")
    .doc(firebaseUid)
    .set(
      {
        lifetimeAccess: true,
        lifetimeAccessGrantedAt: new Date().toISOString(),
        lastPaddleTransactionId: data.id,
      },
      { merge: true },
    );
}
