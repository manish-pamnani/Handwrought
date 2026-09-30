"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  // Keep the modal in the DOM while closed (hidden via `display: none`)
  // instead of unmounting it — used by HelpModal so its links and shortcut
  // list are in the server-rendered HTML for crawlers.
  keepMounted?: boolean;
};

export default function Modal({ open, onClose, title, children, keepMounted = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open && !keepMounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "flex" : "hidden"} items-center justify-center bg-black/40 px-4`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5 shadow-lg"
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-sm font-semibold text-[var(--color-ink)]">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md px-2 py-1 font-sans text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-paper-inset)]"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
