"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { useAuth } from "@/lib/AuthContext";
import { FREE_GENERATIONS_LIMIT, type Tier } from "@/lib/constants";

type AccessData = {
  tier: Tier | null;
  creditsRemaining: number;
  freeGenerationsUsed: number;
  freeGenerationsLimit: number;
};

type AccessState = "loading" | "ready" | "error";

export type UseAccessResult = {
  state: AccessState;
  tier: Tier | null;
  creditsRemaining: number;
  /** re-fetch after a generation, a purchase, or a sign-up, to pick up server-side changes */
  refresh: () => void;
  /** optimistically apply a creditsRemaining value the chat route already returned, no extra fetch */
  setCreditsRemaining: (n: number) => void;
};

const CACHE_PREFIX = "handwrought:access:";

function readCachedAccess(uid: string): AccessData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + uid);
    return raw ? (JSON.parse(raw) as AccessData) : null;
  } catch {
    return null;
  }
}

function writeCachedAccess(uid: string, data: AccessData) {
  try {
    localStorage.setItem(CACHE_PREFIX + uid, JSON.stringify(data));
  } catch {
    // storage full/blocked — the cache is only a first-paint shortcut
  }
}

// What we can show for this user without waiting on /api/access. A guest
// minted on this page load has no users/{uid} doc yet, so the server could
// only answer "no tier, full free allowance" — no need to ask. Anyone else
// gets their last-known values from localStorage, revalidated in the
// background, so a returning visitor isn't held on the loader for a
// token + Firestore round trip on every refresh.
function instantAccess(user: User | null, freshGuestUid: string | null): AccessData | null {
  if (!user) return null;
  if (user.uid === freshGuestUid) {
    return {
      tier: null,
      creditsRemaining: FREE_GENERATIONS_LIMIT,
      freeGenerationsUsed: 0,
      freeGenerationsLimit: FREE_GENERATIONS_LIMIT,
    };
  }
  return readCachedAccess(user.uid);
}

export function useAccess(): UseAccessResult {
  const { user, freshGuestUid } = useAuth();
  // Keyed by uid so a sign-out/sign-in never shows the previous account's credits.
  const [entry, setEntry] = useState<{ uid: string; data: AccessData } | null>(() => {
    const data = instantAccess(user, freshGuestUid);
    return user && data ? { uid: user.uid, data } : null;
  });
  const [failed, setFailed] = useState(false);
  const data = user && entry?.uid === user.uid ? entry.data : null;

  const runCheck = useCallback(async () => {
    if (!user) return;
    setFailed(false);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/access", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("access check failed");
      const json: AccessData = await res.json();
      setEntry({ uid: user.uid, data: json });
    } catch {
      setFailed(true);
    }
  }, [user]);

  // Fetching access/credits calls out to an external system (our API,
  // backed by Firestore) — this necessarily sets state from an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) return;
    const instant = instantAccess(user, freshGuestUid);
    if (instant) setEntry((prev) => (prev?.uid === user.uid ? prev : { uid: user.uid, data: instant }));
    if (user.uid === freshGuestUid) return;
    runCheck();
  }, [runCheck, user, freshGuestUid]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (entry) writeCachedAccess(entry.uid, entry.data);
  }, [entry]);

  function setCreditsRemaining(n: number) {
    setEntry((prev) => (prev ? { ...prev, data: { ...prev.data, creditsRemaining: Math.max(0, n) } } : prev));
  }

  // Only "loading" when there's nothing to show yet — a background
  // revalidation (or a refresh() after a purchase) updates values in place
  // instead of swapping the whole page back to the loader.
  const state: AccessState = data ? "ready" : failed ? "error" : "loading";

  return {
    state,
    tier: data?.tier ?? null,
    creditsRemaining: data?.creditsRemaining ?? FREE_GENERATIONS_LIMIT,
    refresh: runCheck,
    setCreditsRemaining,
  };
}
