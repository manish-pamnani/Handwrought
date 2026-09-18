import { sendGAEvent } from "@next/third-parties/google";

/**
 * Typed wrappers around the four activation-funnel events from the marketing
 * plan (welcome→first outline, suggestion accepted/rejected,
 * credit-exhaustion→paywall shown, guest→signup conversion). `sendGAEvent`
 * itself already no-ops (with a console warning) if GA hasn't initialized —
 * these just fix the event names/params so every call site agrees on them.
 */

export function trackFirstOutlineGenerated() {
  sendGAEvent("event", "first_outline_generated", {});
}

export function trackSuggestionReviewed(decision: "accepted" | "rejected") {
  sendGAEvent("event", "suggestion_reviewed", { decision });
}

export function trackPaywallShown(reason: "credits_exhausted" | "dictation_gated") {
  sendGAEvent("event", "paywall_shown", { reason });
}

export function trackSignupCompleted(method: "guest_upgrade" | "new_account") {
  sendGAEvent("event", "signup_completed", { method });
}

/**
 * Free-tools funnel events (handwrought.online/tools/*) — separate from the
 * activation-funnel events above since they fire from unauthenticated,
 * pre-editor pages. `tool_name` is the URL slug, e.g. "nation-name-generator".
 */

export function trackToolGenerate(toolName: string) {
  sendGAEvent("event", "tool_generate", { tool_name: toolName });
}

export function trackCtaClick(toolName: string, placement: string) {
  sendGAEvent("event", "cta_click", { tool_name: toolName, placement });
}

function trackSignupFromTool(toolName: string) {
  sendGAEvent("event", "signup_from_tool", { tool_name: toolName });
}

const REFERRING_TOOL_KEY = "handwrought:referring_tool";
const REFERRING_TOOL_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Call from a tool page's CTA, right before navigating to the main app —
 * records which tool sent this visitor so a signup shortly after can be
 * attributed back to it via trackReferredSignup.
 */
export function recordToolReferral(toolName: string) {
  try {
    window.localStorage.setItem(REFERRING_TOOL_KEY, JSON.stringify({ toolName, at: Date.now() }));
  } catch {
    // storage unavailable — attribution is best-effort, never blocks the click-through
  }
}

/**
 * Call right after a real signup completes (see lib/AuthContext.tsx). Fires
 * signup_from_tool only if a tool-page CTA click was recorded within the last
 * 24h, then clears the record so it can't attribute a later, unrelated signup.
 */
export function trackReferredSignup() {
  try {
    const raw = window.localStorage.getItem(REFERRING_TOOL_KEY);
    if (!raw) return;
    window.localStorage.removeItem(REFERRING_TOOL_KEY);
    const { toolName, at } = JSON.parse(raw) as { toolName?: string; at?: number };
    if (typeof toolName === "string" && typeof at === "number" && Date.now() - at < REFERRING_TOOL_TTL_MS) {
      trackSignupFromTool(toolName);
    }
  } catch {
    // corrupted record — nothing to attribute
  }
}
