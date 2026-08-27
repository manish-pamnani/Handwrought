import { getAppCheck } from "firebase-admin/app-check";

// Gated behind an explicit env flag so this can't start rejecting real
// traffic before both halves are actually in place: the client side
// (NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY in lib/firebase.ts, wired into the
// reCAPTCHA Enterprise provider) and the app being registered for App Check
// in the Firebase Console. Flip FIREBASE_APPCHECK_ENFORCE to "true" once
// both are done — until then this no-ops (every request passes).
export const APP_CHECK_ENFORCED = process.env.FIREBASE_APPCHECK_ENFORCE === "true";

/**
 * Verifies the X-Firebase-AppCheck header proves the request came from
 * HandWrought's real client (not a script hitting the API directly) — the
 * primary defense against scripted free-tier abuse, since it blocks
 * non-app-originated traffic before it can even reach the per-IP rate limit
 * or the free-generation count check.
 */
export async function verifyAppCheck(request: Request): Promise<boolean> {
  if (!APP_CHECK_ENFORCED) return true;

  const token = request.headers.get("X-Firebase-AppCheck");
  if (!token) return false;

  try {
    await getAppCheck().verifyToken(token);
    return true;
  } catch {
    return false;
  }
}
