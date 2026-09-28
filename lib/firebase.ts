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

// Proves requests to /api/chat, /api/import and /api/dictate came from this
// real app instance rather than a script — the main defense against scripted
// free-tier abuse. Silently no-ops until NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY
// is set (a reCAPTCHA Enterprise key ID — from a Web-type key created in the
// SAME Cloud project as this Firebase project, then registered against this
// app in Firebase Console > App Check > Apps). Matching server-side gate:
// lib/appCheck.ts (FIREBASE_APPCHECK_ENFORCE).
//
// Deliberately initialized on a SECOND app instance, not firebaseApp: when App
// Check is registered on the same app as Auth, Firebase Auth waits for an App
// Check token before every Auth request — guest sign-in and the saved-user
// reload on page load included — so reCAPTCHA Enterprise sat on the critical
// path of the first-load loader. Tokens are bound to the web appId, not the
// JS app instance, so a second instance built from the same config mints
// tokens the server verifies exactly the same way.
//
// Also started lazily, once the browser is idle after load, so downloading
// and running reCAPTCHA doesn't compete with the page's own JS. A generation
// fired before then just initializes it on demand.
const APP_CHECK_APP_NAME = "appcheck";
const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
let appCheck: AppCheck | null = null;

function ensureAppCheck(): AppCheck | null {
  if (appCheck || typeof window === "undefined" || !appCheckSiteKey) return appCheck;
  const app = getApps().find((a) => a.name === APP_CHECK_APP_NAME) ?? initializeApp(firebaseConfig, APP_CHECK_APP_NAME);
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheck;
}

if (typeof window !== "undefined" && appCheckSiteKey) {
  const start = () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => ensureAppCheck(), { timeout: 3000 });
    else setTimeout(ensureAppCheck, 1000);
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}

/** App Check header to spread into a fetch() call — empty object if App Check isn't configured. */
export async function getAppCheckHeader(): Promise<Record<string, string>> {
  const instance = ensureAppCheck();
  if (!instance) return {};
  try {
    const { token } = await getAppCheckToken(instance);
    return { "X-Firebase-AppCheck": token };
  } catch {
    // Token fetch failed (network blip, reCAPTCHA not ready yet) — fail open
    // rather than blocking generation; the server-side gate simply won't see
    // a token and will reject only if FIREBASE_APPCHECK_ENFORCE is on.
    return {};
  }
}
