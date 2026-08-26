"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

const SUPPORT_EMAIL = "handwrought.support@gmail.com";

function PlaceholderAvatar() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-7 w-7 shrink-0 rounded-full bg-[var(--color-paper-inset)] text-[var(--color-ink-muted)]"
      aria-hidden="true"
    >
      <circle cx="16" cy="12" r="5.5" fill="currentColor" opacity="0.5" />
      <path d="M5 27c1.8-6 6-9 11-9s9.2 3 11 9" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinejoin="round" d="M3 15h14l1-8-4.5 3L10 4 6.5 10 2 7l1 8z" />
      <path strokeLinecap="round" d="M4 17.5h12" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path strokeLinecap="round" d="M7.8 7.8a2.2 2.2 0 1 1 3.2 1.96c-.7.36-1 .84-1 1.49v.4" />
      <circle cx="10" cy="13.9" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CreditsIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path strokeLinecap="round" d="M2.5 8h15" />
      <path strokeLinecap="round" d="M5 12h4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 17.5h-3a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1h3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 14 17 10l-4.5-4" />
      <path strokeLinecap="round" d="M17 10H7" />
    </svg>
  );
}

export default function UserMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
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

  const name = user.displayName;
  const email = user.email ?? "";

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-[var(--color-paper-inset)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Google-hosted avatar, not a local/optimizable asset
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-7 w-7 shrink-0 rounded-full" />
        ) : (
          <PlaceholderAvatar />
        )}
        <span className="max-w-[140px] truncate font-sans text-xs font-medium text-[var(--color-ink)]">
          {name || email}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] shadow-lg"
        >
          <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-3.5 py-3">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Google-hosted avatar, not a local/optimizable asset
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 shrink-0 rounded-full" />
            ) : (
              <PlaceholderAvatar />
            )}
            <div className="min-w-0">
              {name && <p className="truncate font-sans text-[13px] font-semibold text-[var(--color-ink)]">{name}</p>}
              <p className="truncate font-sans text-[12px] text-[var(--color-ink-muted)]">{email}</p>
            </div>
          </div>

          <div className="flex flex-col py-1.5">
            <Link
              href="/checkout"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 font-sans text-[13px] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
            >
              <CrownIcon />
              Upgrade to Pro
            </Link>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 font-sans text-[13px] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
            >
              <HelpIcon />
              Contact Support
            </a>
            <Link
              href="/checkout"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 font-sans text-[13px] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
            >
              <CreditsIcon />
              Plans &amp; Credits
            </Link>
          </div>

          <div className="border-t border-[var(--color-border)] py-1.5">
            <button
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3.5 py-2 font-sans text-[13px] font-medium text-red-600 transition-colors hover:bg-[var(--color-paper-inset)]"
            >
              <LogoutIcon />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
