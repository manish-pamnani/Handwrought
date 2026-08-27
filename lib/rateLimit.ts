import { getAdminDb } from "@/lib/firebaseAdmin";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fixed-window rate limit, keyed by `${scope}:${key}` (e.g. a client IP).
 * Returns true and counts the request if under `limit` for the current
 * window, false if the window's limit is already hit. Backstop against the
 * free-tier generation abuse vector — a reset anonymous session gets fresh
 * free generations (see lib/constants.ts), but repeatedly resetting from the
 * same IP still hits this limit.
 */
export async function checkRateLimit(scope: string, key: string, limit: number): Promise<boolean> {
  const id = `${scope}:${key}`.replace(/\//g, "_");
  const ref = getAdminDb().collection("rateLimits").doc(id);

  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const windowResetAt = typeof data?.windowResetAt === "number" ? data.windowResetAt : 0;
    const now = Date.now();

    if (now >= windowResetAt) {
      tx.set(ref, { count: 1, windowResetAt: now + WINDOW_MS });
      return true;
    }

    const count = typeof data?.count === "number" ? data.count : 0;
    if (count >= limit) return false;

    tx.set(ref, { count: count + 1, windowResetAt }, { merge: true });
    return true;
  });
}

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
