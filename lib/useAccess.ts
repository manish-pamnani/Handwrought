"use client";

import { useCallback, useEffect, useState } from "react";
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

export function useAccess(): UseAccessResult {
  const { user } = useAuth();
  const [state, setState] = useState<AccessState>("loading");
  const [data, setData] = useState<AccessData | null>(null);

  const runCheck = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/access", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("access check failed");
      const json: AccessData = await res.json();
      setData(json);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user]);

  // Fetching access/credits calls out to an external system (our API,
  // backed by Firestore) — this necessarily sets state from an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    runCheck();
  }, [runCheck]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function setCreditsRemaining(n: number) {
    setData((prev) => (prev ? { ...prev, creditsRemaining: Math.max(0, n) } : prev));
  }

  return {
    state,
    tier: data?.tier ?? null,
    creditsRemaining: data?.creditsRemaining ?? FREE_GENERATIONS_LIMIT,
    refresh: runCheck,
    setCreditsRemaining,
  };
}
