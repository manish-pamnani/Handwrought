// Shared between /api/chat and /api/import (PDF branch) — keep both routes
// pointed at the same models rather than letting them drift independently.

// Rotation order, tried on every request. Free-tier rate limits on any one
// Gemini model are low enough that a burst of traffic can trip a 429 on its
// own — rather than surfacing that to the user, we retry the same request
// against the next model in this list, each of which has its own capacity
// pool. Ordered cheapest/highest-quota first.
export const GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];

export type GeminiUsage = {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
};

// Gemini's response carries the real, billed token counts in `usageMetadata`
// — pulling this out (instead of discarding it with the rest of the response)
// is what turns cost estimates into real, measured numbers. Shared by both
// /api/chat and /api/import so their usage logs stay in the same shape.
export function extractGeminiUsage(data: unknown): GeminiUsage {
  const usage = (data as { usageMetadata?: Record<string, unknown> } | null | undefined)?.usageMetadata;
  return {
    promptTokens: typeof usage?.promptTokenCount === "number" ? usage.promptTokenCount : 0,
    outputTokens: typeof usage?.candidatesTokenCount === "number" ? usage.candidatesTokenCount : 0,
    totalTokens: typeof usage?.totalTokenCount === "number" ? usage.totalTokenCount : 0,
  };
}

/**
 * Calls `call` with each model in GEMINI_MODELS in order, moving to the next
 * one only when the current model is overloaded/rate-limited (429/502/503).
 * Any other error, or exhausting the list, propagates to the caller.
 */
export async function callGeminiWithRotation<T>(call: (model: GeminiModel) => Promise<T>): Promise<T> {
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    try {
      return await call(model);
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      const isOverloaded = status !== undefined && [429, 502, 503].includes(status);
      const isLastModel = i === GEMINI_MODELS.length - 1;
      if (!isOverloaded || isLastModel) throw err;
      console.warn(`${model} unavailable (${status}), retrying with ${GEMINI_MODELS[i + 1]}`);
    }
  }
  // Unreachable — GEMINI_MODELS is non-empty, so the loop always returns or throws.
  throw new Error("No Gemini models configured.");
}
