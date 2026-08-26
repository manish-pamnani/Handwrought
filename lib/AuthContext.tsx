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
  signInWithGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signUp(email: string, password: string) {
    // If the visitor is already an anonymous guest (the common case now that
    // `/` bootstraps a guest session on load), upgrade that account in place
    // via linkWithCredential rather than creating a fresh one — this keeps
    // their uid (and therefore their free-generation count and localStorage
    // document) intact across the guest → real-account transition.
    if (auth.currentUser?.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(auth.currentUser, credential);
      trackSignupCompleted("guest_upgrade");
      return;
    }
    await createUserWithEmailAndPassword(auth, email, password);
    trackSignupCompleted("new_account");
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle() {
    // Same guest-upgrade logic as signUp above: keep the anonymous uid (and
    // its free-generation count) by linking Google to it in place, rather
    // than starting a fresh account.
    if (auth.currentUser?.isAnonymous) {
      try {
        await linkWithPopup(auth.currentUser, googleProvider);
        trackSignupCompleted("guest_upgrade");
        return;
      } catch (err) {
        // That Google account is already tied to a different Firebase user —
        // fall back to signing into the existing account instead of
        // upgrading this guest session.
        if ((err as { code?: string })?.code !== "auth/credential-already-in-use") throw err;
      }
    }
    const result = await signInWithPopup(auth, googleProvider);
    if (getAdditionalUserInfo(result)?.isNewUser) trackSignupCompleted("new_account");
  }

  async function signInGuest() {
    await signInAnonymously(auth);
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signInGuest, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
