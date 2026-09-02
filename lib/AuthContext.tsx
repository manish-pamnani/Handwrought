"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  signInWithPopup,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  EmailAuthProvider,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { trackSignupCompleted } from "@/lib/analytics";

const googleProvider = new GoogleAuthProvider();

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUpWithGoogle: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped after linkWithCredential/linkWithPopup — see refreshUser below.
  // Its value is never read; it exists purely to force a re-render.
  const [, forceRerender] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // linkWithCredential/linkWithPopup upgrade the CURRENT user object in
  // place — same uid, no sign-out/sign-in transition — so Firebase doesn't
  // reliably re-fire onAuthStateChanged the way it does for a real sign-in.
  // Without this, anything gated on `!user.isAnonymous` (the checkout auth
  // gate, /plans-and-credits, TopBar's guest label) never notices the
  // upgrade and stays stuck showing the pre-link state, even though the
  // link itself succeeded server-side.
  //
  // Explicitly re-reading auth.currentUser and pushing it into state (not
  // just forcing a re-render) matters: whether Firebase mutates the existing
  // User object in place or hands back a distinct one on the next read isn't
  // something to rely on either way — setUser(auth.currentUser) is correct
  // under both, while a bare re-render is only correct if the former holds.
  // Confirmed via a real repro that assuming in-place mutation alone isn't
  // reliable — the guest label stayed stuck even after linking succeeded.
  // The forceRerender bump stays too, as a backstop in case
  // auth.currentUser ever returns a reference setUser bails out on
  // (Object.is same-reference) despite fields having changed underneath it.
  function refreshUser() {
    setUser(auth.currentUser);
    forceRerender((n) => n + 1);
  }

  async function signUp(email: string, password: string) {
    // If the visitor is already an anonymous guest (the common case now that
    // `/` bootstraps a guest session on load), upgrade that account in place
    // via linkWithCredential rather than creating a fresh one — this keeps
    // their uid (and therefore their free-generation count and localStorage
    // document) intact across the guest → real-account transition.
    if (auth.currentUser?.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(auth.currentUser, credential);
      refreshUser();
      trackSignupCompleted("guest_upgrade");
      return;
    }
    await createUserWithEmailAndPassword(auth, email, password);
    trackSignupCompleted("new_account");
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUpWithGoogle() {
    // Same guest-upgrade logic as signUp above: keep the anonymous uid (and
    // its free-generation count) by linking Google to it in place, rather
    // than starting a fresh account.
    if (auth.currentUser?.isAnonymous) {
      try {
        await linkWithPopup(auth.currentUser, googleProvider);
        refreshUser();
        trackSignupCompleted("guest_upgrade");
        return;
      } catch (err) {
        // That Google identity is already spoken for — either the same
        // Google account is linked to a different Firebase user
        // (credential-already-in-use), or this email already has a
        // different-provider account, most commonly password
        // (email-already-in-use). Either way, fall back to signing into
        // whichever account actually owns it instead of upgrading this guest.
        const code = (err as { code?: string })?.code;
        if (code !== "auth/credential-already-in-use" && code !== "auth/email-already-in-use") throw err;
      }
    }
    const result = await signInWithPopup(auth, googleProvider);
    if (getAdditionalUserInfo(result)?.isNewUser) trackSignupCompleted("new_account");
  }

  // Deliberately does NOT attempt to link/upgrade an anonymous guest — unlike
  // signUpWithGoogle, "sign in" means the visitor is asserting they already
  // have an account, so go straight to authenticating as it instead.
  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider);
  }

  async function signInGuest() {
    await signInAnonymously(auth);
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signUp, signIn, signUpWithGoogle, signInWithGoogle, signInGuest, signOutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
