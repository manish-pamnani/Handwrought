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

export function trackPaywallShown(reason: "credits_exhausted") {
  sendGAEvent("event", "paywall_shown", { reason });
}

export function trackSignupCompleted(method: "guest_upgrade" | "new_account") {
  sendGAEvent("event", "signup_completed", { method });
}
