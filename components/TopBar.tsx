"use client";

import Image from "next/image";
import { useState } from "react";
import { countWords } from "@/lib/wordCount";

type TopBarProps = {
  documentText: string;
};

export default function TopBar({ documentText }: TopBarProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const wordCount = countWords(documentText);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(documentText);
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
      </div>
    </header>
  );
}
