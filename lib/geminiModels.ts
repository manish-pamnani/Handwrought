// Shared between /api/chat and /api/import (PDF branch) — keep both routes
// pointed at the same models rather than letting them drift independently.

// Full-quality tier: BYOK, lifetime access, or still-in-credit guests.
// gemini-flash-latest has been overloaded/rate-limited more often lately, so
// gemini-2.5-flash (a pinned version with its own capacity pool) is primary.
export const STANDARD_MODEL = "gemini-3.5-flash-lite";
// Tried once, automatically, only when STANDARD_MODEL itself is overloaded/
// rate-limited (502/503/429) — a different model has its own capacity pool,
// so this rides out Google-side demand spikes without surfacing an error.
export const STANDARD_MODEL_FALLBACK = "gemini-2.5-flash";
// Fallback tier once a guest's free generations run out and they choose to
// keep going anyway ("continue with poor quality" in the upgrade popup).
export const DEGRADED_MODEL = "gemini-2.5-flash";
