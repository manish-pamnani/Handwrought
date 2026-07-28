"use client";

import Image from "next/image";
import { useState, type RefObject } from "react";
import { countWords } from "@/lib/wordCount";
import type { DocumentPanelHandle } from "./DocumentPanel";

type TopBarProps = {
  documentText: string;
  documentPanelRef: RefObject<DocumentPanelHandle | null>;
  userEmail: string;
  onSignOut: () => void;
  onOpenSettings: () => void;
};

export default function TopBar({ documentText, documentPanelRef, userEmail, onSignOut, onOpenSettings }: TopBarProps) {
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
    const blob = new Blob([documentText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "draft.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-paper)] px-5 py-3">
      <div className="flex items-center gap-2.5">
        <Image src="/handwrought-icon.svg" alt="" width={26} height={26} priority />
        <span className="font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
          HandWrought
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="font-mono text-xs tracking-wide text-[var(--color-ink-muted)]">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
        <button
          onClick={handleCopy}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-sans text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
        >
          {copyState === "copied" ? "Copied" : "Copy"}
        </button>
        <button
          onClick={handleExport}
          className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-sans text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Export
        </button>
        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />
        <span className="max-w-[160px] truncate font-mono text-xs text-[var(--color-ink-muted)]" title={userEmail}>
          {userEmail}
        </span>
        <button
          onClick={onOpenSettings}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-sans text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
        >
          Settings
        </button>
        <button
          onClick={onSignOut}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-sans text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
