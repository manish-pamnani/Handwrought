"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type RefObject } from "react";
import type { User } from "firebase/auth";
import { countWords } from "@/lib/wordCount";
import { FREE_GENERATIONS_LIMIT, TIER_NAMES, type Tier } from "@/lib/constants";
import type { DocumentPanelHandle } from "./DocumentPanel";
import UserMenu from "./UserMenu";
import MobileActionsMenu from "./MobileActionsMenu";

type TopBarProps = {
  documentText: string;
  documentPanelRef: RefObject<DocumentPanelHandle | null>;
  isGuest: boolean;
  user: User | null;
  tier: Tier | null;
  creditsRemaining: number;
  onSignOut: () => void;
  onOpenSettings: () => void;
  onOpenSignUp: () => void;
  /** lets GuidedAnnotations measure the real credits element to point its arrow at */
  creditsRef?: RefObject<HTMLSpanElement | null>;
  /** docking target the whole-document composer pill animates into once onboarding latches */
  headerSlotRef?: RefObject<HTMLDivElement | null>;
  /** true once the composer has actually docked here — before that, this slot is empty
   *  (the pill is still centered in WelcomeOverlay), so on mobile it shouldn't reserve
   *  a whole extra row for nothing. */
  composerDocked?: boolean;
};

export default function TopBar({
  documentText,
  documentPanelRef,
  isGuest,
  user,
  tier,
  creditsRemaining,
  onSignOut,
  onOpenSettings,
  onOpenSignUp,
  creditsRef,
  composerDocked = false,
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
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-paper)] px-5 py-3 sm:flex-nowrap">
      <Link href="/" className="order-1 flex shrink-0 items-center gap-2.5">
        <Image src="/handwrought-icon.svg" alt="" width={26} height={26} priority />
        {/* Wordmark text is brand presence, not function — dropped below sm
            so the icon alone (still a real home link) doesn't compete with
            the composer for width on a narrow header. */}
        <span className="hidden font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)] sm:inline">
          HandWrought
        </span>
      </Link>

      {/* Empty on purpose — DocumentComposer docks its pill here (via
          fixed-position + measured-rect animation) once onboarding latches.
          w-full below sm forces it onto its own wrapped row (order-3) since
          it's the one element that must never lose the space fight with the
          shrink-0 items around it; back to inline flex-1 at sm and up,
          matching the original single-row layout exactly. Only reserves
          that row once something's actually docked here — before that the
          pill is still centered in WelcomeOverlay, so an empty full-width
          row would just be dead space (the bug the composerDocked check
          fixes: a header that looked oddly tall with nothing in it).
          `hidden` rather than a zero size below sm when undocked — a
          zero-width flex item still counts toward justify-between's space
          distribution, which was pulling the mobile cluster toward the
          center instead of the right edge; fully removing it from layout
          fixes that. sm:block restores it unconditionally at sm and up,
          matching the original single-row desktop behavior. */}
      <div
        ref={headerSlotRef}
        className={`${composerDocked ? "block h-9 w-full" : "hidden"} order-3 min-w-0 sm:order-2 sm:block sm:h-9 sm:w-auto sm:max-w-sm sm:flex-1`}
      />

      <div className="order-2 flex shrink-0 items-center gap-2 sm:order-3 sm:gap-4">
        {/* Desktop cluster — unchanged from before, just hidden below sm
            where MobileActionsMenu takes over instead. */}
        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <span className="font-mono text-xs tracking-wide text-[var(--color-ink-muted)]">
            {wordCount} {wordCount === 1 ? "word" : "words"} · {documentText.length}{" "}
            {documentText.length === 1 ? "character" : "characters"}
          </span>
          <button
            onClick={handleCopy}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-sans text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)] hover:cursor-pointer"
          >
            {copyState === "copied" ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleExport}
            disabled={!documentText.trim()}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-sans text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--color-accent)] hover:cursor-pointer"
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
                : `Guest · ${creditsRemaining} free ${creditsRemaining === 1 ? "generation" : "generations"} left`}
            </span>

            {/* pt-2 (not mt-2) keeps the gap above the card inside the hoverable
                box, so crossing it doesn't drop pointer-events before the
                cursor reaches the button below */}
            <div className="pointer-events-none absolute right-0 top-full z-50 w-64 pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-3 shadow-lg">
                {tier ? (
                  <>
                    <p className="mb-1 font-sans text-[12px] font-semibold text-[var(--color-ink)]">How credits work</p>
                    <p className="font-sans text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                      You&apos;re on the {tier && TIER_NAMES[tier]} pack — {creditsRemaining} credits left. They never
                      expire and don&apos;t reset; buy more anytime you run low. Every generation is flat: 1 credit, any
                      length.
                    </p>
                    {/* Credits granted while still a guest only live in this
                        browser's storage — clearing site data or switching
                        devices loses them for good, with no way back in
                        (there's no email/password tied to an anonymous
                        session). This is the only guest-visible path to fix
                        that after the fact; going forward the checkout auth
                        gate stops a purchase from ever landing in this state. */}
                    <Link
                      href="/checkout"
                      className="mt-2.5 block w-full rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-center font-sans text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                    >
                      Sign in to save these credits
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mb-1 font-sans text-[12px] font-semibold text-[var(--color-ink)]">How free generations work</p>
                    <p className="font-sans text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                      Guests get {FREE_GENERATIONS_LIMIT} free generations, no card required — a short edit uses 1,
                      a whole-document action on a longer piece uses more, based on length. Paid credits don&apos;t
                      work this way: every generation is flat, 1 credit no matter the length.
                    </p>
                    <Link
                      href="/checkout"
                      className="mt-2.5 block w-full rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-center font-sans text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                    >
                      Get Credits
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
            user && <UserMenu user={user} onSignOut={onSignOut} />
          )}
        </div>

        {/* Mobile cluster — the same actions, collapsed into one menu since
            none of the above fits next to the composer on a narrow header. */}
        <div className="flex items-center gap-2 sm:hidden">
          <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">{wordCount}w</span>
          <MobileActionsMenu
            wordCount={wordCount}
            charCount={documentText.length}
            copyState={copyState}
            onCopy={handleCopy}
            onExport={handleExport}
            exportDisabled={!documentText.trim()}
            isGuest={isGuest}
            tier={tier}
            creditsRemaining={creditsRemaining}
            user={user}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </header>
  );
}
