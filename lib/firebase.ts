import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken as getAppCheckToken, type AppCheck } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Proves requests to /api/chat and /api/import came from this real app
// instance rather than a script — the main defense against scripted
// free-tier abuse. Silently no-ops until NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY
// is set (a reCAPTCHA Enterprise key ID — from a Web-type key created in the
// SAME Cloud project as this Firebase project, then registered against this
// app in Firebase Console > App Check > Apps), so this doesn't break anything
// before that's configured. Matching server-side gate: lib/appCheck.ts
// (FIREBASE_APPCHECK_ENFORCE).
let appCheck: AppCheck | null = null;
const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
if (typeof window !== "undefined" && appCheckSiteKey) {
  appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

/** App Check header to spread into a fetch() call — empty object if App Check isn't configured. */
export async function getAppCheckHeader(): Promise<Record<string, string>> {
  if (!appCheck) return {};
  try {
    const { token } = await getAppCheckToken(appCheck);
    return { "X-Firebase-AppCheck": token };
  } catch {
    // Token fetch failed (network blip, reCAPTCHA not ready yet) — fail open
    // rather than blocking generation; the server-side gate simply won't see
    // a token and will reject only if FIREBASE_APPCHECK_ENFORCE is on.
    return {};
  }
}
