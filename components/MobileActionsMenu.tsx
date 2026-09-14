"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { TIER_NAMES, type Tier } from "@/lib/constants";

const SUPPORT_EMAIL = "handwrought.support@gmail.com";

function KebabIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <circle cx="10" cy="4" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="10" cy="16" r="1.4" />
    </svg>
  );
}

type MobileActionsMenuProps = {
  wordCount: number;
  charCount: number;
  copyState: "idle" | "copied";
  onCopy: () => void;
  onExport: () => void;
  exportDisabled: boolean;
  isGuest: boolean;
  tier: Tier | null;
  creditsRemaining: number;
  user: User | null;
  onSignOut: () => void;
};

// Mobile-only counterpart to the desktop cluster (word count, Copy, Export,
// the credits pill / UserMenu) — collapsed into one overflow menu since none
// of that fits alongside the composer on a narrow header. Same open/outside-
// click/Escape pattern as UserMenu.tsx, for a consistent interaction model
// rather than a second dropdown behavior in the same app.
export default function MobileActionsMenu({
  wordCount,
  charCount,
  copyState,
  onCopy,
  onExport,
  exportDisabled,
  isGuest,
  tier,
  creditsRemaining,
  user,
  onSignOut,
}: MobileActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const email = user?.email ?? "";

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-paper-inset)]"
      >
        <KebabIcon />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] shadow-lg"
        >
          <div className="border-b border-[var(--color-border)] px-3.5 py-2.5 font-mono text-[11px] tracking-wide text-[var(--color-ink-muted)]">
            {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount} {charCount === 1 ? "character" : "characters"}
          </div>

          <div className="flex flex-col py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onCopy();
              }}
              className="px-3.5 py-2 text-left font-sans text-[13px] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
            >
              {copyState === "copied" ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={exportDisabled}
              onClick={() => {
                setOpen(false);
                onExport();
              }}
              className="px-3.5 py-2 text-left font-sans text-[13px] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export
            </button>
          </div>

          <div className="border-t border-[var(--color-border)] py-2 px-3.5">
            {isGuest ? (
              <>
                <p className="font-sans text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                  {tier
                    ? `${TIER_NAMES[tier]} pack — ${creditsRemaining} ${creditsRemaining === 1 ? "credit" : "credits"} left`
                    : `Guest — ${creditsRemaining} free ${creditsRemaining === 1 ? "generation" : "generations"} left`}
                </p>
                <Link
                  href="/checkout"
                  onClick={() => setOpen(false)}
                  className="mt-2 block w-full rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-center font-sans text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                  {tier ? "Sign in to save these credits" : "Get Credits"}
                </Link>
              </>
            ) : (
              user && (
                <>
                  <p className="truncate font-sans text-[12px] text-[var(--color-ink-muted)]">{email}</p>
                  <div className="mt-2 flex flex-col gap-1">
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="py-1 font-sans text-[13px] text-[var(--color-ink)] transition-colors hover:text-[var(--color-accent)]"
                    >
                      Contact Support
                    </a>
                    <Link
                      href="/plans-and-credits"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="py-1 font-sans text-[13px] text-[var(--color-ink)] transition-colors hover:text-[var(--color-accent)]"
                    >
                      Plans &amp; Credits
                    </Link>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        onSignOut();
                      }}
                      className="py-1 text-left font-sans text-[13px] font-medium text-red-600 transition-colors"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
