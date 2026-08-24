"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type RefObject } from "react";
import { countWords } from "@/lib/wordCount";
import { FREE_GENERATIONS_LIMIT, type Tier } from "@/lib/constants";
import type { DocumentPanelHandle } from "./DocumentPanel";

type TopBarProps = {
  documentText: string;
  documentPanelRef: RefObject<DocumentPanelHandle | null>;
  isGuest: boolean;
  userEmail: string | null;
  tier: Tier | null;
  creditsRemaining: number;
  onSignOut: () => void;
  onOpenSettings: () => void;
  onOpenSignUp: () => void;
  /** lets GuidedAnnotations measure the real credits element to point its arrow at */
  creditsRef?: RefObject<HTMLSpanElement | null>;
  /** docking target the whole-document composer pill animates into once onboarding latches */
  headerSlotRef?: RefObject<HTMLDivElement | null>;
};

export default function TopBar({
  documentText,
  documentPanelRef,
  isGuest,
  userEmail,
  tier,
  creditsRemaining,
  onSignOut,
  onOpenSettings,
  onOpenSignUp,
  creditsRef,
  headerSlotRef,
}: TopBarProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const wordCount = countWords(documentText);

  async function handleCopy() {
    try {
      const editor = documentPanelRef.current?.getEditor();
      if (editor && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([editor.getHTML()], { type: "text/html" }),
            "text/plain": new Blob([documentText], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(documentText);
      }
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      // clipboard access denied — silently ignore, nothing to recover
    }
  }

  function handleExport() {
    if (!documentText.trim()) return;
    const blob = new Blob([documentText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "draft.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <header className="flex justify-between items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-paper)] px-5 py-3">
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <Image src="/handwrought-icon.svg" alt="" width={26} height={26} priority />
        <span className="font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
          HandWrought
        </span>
      </Link>

      {/* Empty on purpose — DocumentComposer docks its pill here (via
          fixed-position + measured-rect animation) once onboarding latches. */}
      <div ref={headerSlotRef} className="h-9 max-w-sm min-w-0 flex-1" />

      <div className="flex shrink-0 items-center gap-4">
        <span className="font-mono text-xs tracking-wide text-[var(--color-ink-muted)]">
          {wordCount} {wordCount === 1 ? "word" : "words"} · {documentText.length} {documentText.length === 1 ? "character" : "characters"}
        </span>
        <button
          onClick={handleCopy}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-sans text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
        >
          {copyState === "copied" ? "Copied" : "Copy"}
        </button>
        <button
          onClick={handleExport}
          disabled={!documentText.trim()}
          className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-sans text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--color-accent)]"
        >
          Export
        </button>
        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />
        {isGuest ? (
          <div className="group relative">
            <span
              ref={creditsRef}
              className="max-w-[200px] cursor-help truncate font-mono text-xs text-[var(--color-ink-muted)] underline decoration-dotted decoration-[var(--color-border)] underline-offset-4"
            >
              {tier
                ? `Guest · ${creditsRemaining} ${creditsRemaining === 1 ? "credit" : "credits"} left`
                : `Guest · ${creditsRemaining} free ${creditsRemaining === 1 ? "credit" : "credits"} left`}
            </span>

            {/* pt-2 (not mt-2) keeps the gap above the card inside the hoverable
                box, so crossing it doesn't drop pointer-events before the
                cursor reaches the button below */}
            <div className="pointer-events-none absolute right-0 top-full z-50 w-64 pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-3 shadow-lg">
                <p className="mb-1 font-sans text-[12px] font-semibold text-[var(--color-ink)]">How credits work</p>
                {tier ? (
                  <p className="font-sans text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                    You have Lifetime Access (${tier} tier) — {creditsRemaining} credits left this cycle, refreshing
                    automatically every 30 days.
                  </p>
                ) : (
                  <>
                    <p className="font-sans text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                      Every AI generation — writing an outline, rewriting the whole document, or a quick edit on a
                      selection — uses 1 credit. Importing a PDF or Word doc also uses 1 credit (.txt/.md imports are
                      free). Guests get {FREE_GENERATIONS_LIMIT} free, no card required.
                    </p>
                    <Link
                      href="/checkout"
                      className="mt-2.5 block w-full rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-center font-sans text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                    >
                      Get Lifetime Access
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <span className="max-w-[160px] truncate font-mono text-xs text-[var(--color-ink-muted)]" title={userEmail ?? undefined}>
            {userEmail}
          </span>
        )}
        {!isGuest && (
          <button
            onClick={onSignOut}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-sans text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
