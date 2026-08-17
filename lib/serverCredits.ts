import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FREE_GENERATIONS_LIMIT } from "@/lib/constants";

export type Usage = {
  lifetimeAccess: boolean;
  freeGenerationsUsed: number;
  freeGenerationsLimit: number;
};

export async function getUsage(uid: string): Promise<Usage> {
  const snap = await getAdminDb().collection("users").doc(uid).get();
  const data = snap.data();
  return {
    lifetimeAccess: data?.lifetimeAccess === true,
    freeGenerationsUsed: typeof data?.freeGenerationsUsed === "number" ? data.freeGenerationsUsed : 0,
    freeGenerationsLimit: FREE_GENERATIONS_LIMIT,
  };
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
