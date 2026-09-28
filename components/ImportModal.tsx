"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import Modal from "./Modal";

type ImportResponse = { text?: string; error?: string; code?: string; creditsRemaining?: number };

type ImportModalProps = {
  open: boolean;
  onClose: () => void;
  /** parsed markdown text — caller drops it straight into the document */
  onImport: (markdown: string) => void;
  /** BYOK Gemini key, only actually used server-side for the PDF branch (unlimited, full quality) */
  apiKey: string | null;
  /** applies a creditsRemaining value the PDF branch already spent, no extra fetch (mirrors access.setCreditsRemaining) */
  onCreditsRemaining: (n: number) => void;
  /** out-of-credit guest hit a PDF import — same signal handleSend's paywall check uses */
  onCreditsExhausted: () => void;
};

const MAX_FILE_MB = 10;

export default function ImportModal({
  open,
  onClose,
  onImport,
  apiKey,
  onCreditsRemaining,
  onCreditsExhausted,
}: ImportModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "importing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const anyInputRef = useRef<HTMLInputElement>(null);

  // Reset transient state each time the modal is (re)opened — adjusting
  // state during render (rather than in an effect) on an open-prop
  // transition, per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStatus("idle");
      setError(null);
      setDragActive(false);
    }
  }

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is too large — max ${MAX_FILE_MB}MB.`);
      return;
    }

    setStatus("importing");
    try {
      const token = await user?.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      if (apiKey) formData.append("apiKey", apiKey);

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        body: formData,
      });
      const data: ImportResponse | null = await res.json().catch(() => null);

      if (res.status === 402 && data?.code === "credits_exhausted") {
        onCreditsExhausted();
        onClose();
        return;
      }
      if (!res.ok || !data?.text) {
        setError(data?.error ?? "Couldn't import that file — try a different one.");
        setStatus("idle");
        return;
      }

      if (typeof data.creditsRemaining === "number") onCreditsRemaining(data.creditsRemaining);
      onImport(data.text);
    } catch {
      setError("Something went wrong — try again.");
      setStatus("idle");
    }
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after an error
    if (file) handleFile(file);
  }

  const importing = status === "importing";

  return (
    // While a file's mid-upload, closing (X / backdrop / Escape) is disabled
    // — an accidental close here would either strand the fetch's eventual
    // onImport/onClose against an already-torn-down modal, or let the user
    // fire off a second import (and a second credit charge) on top of it.
    <Modal open={open} onClose={importing ? () => {} : onClose} title="Import a document">
      <p className="mb-1 font-sans text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        Bring in an existing PDF or Word doc — we&apos;ll drop the text straight into the editor.
      </p>
      <p className="mb-4 font-mono text-[10px] text-[var(--color-ink-muted)]">
        PDF and Word imports use 1 credit, same as a generation · .txt/.md imports are free
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={importing}
          onClick={() => pdfInputRef.current?.click()}
          className="flex-1 rounded-full border border-[var(--color-border)] px-3 py-2 font-sans text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import from PDF
        </button>
        <button
          type="button"
          disabled={importing}
          onClick={() => wordInputRef.current?.click()}
          className="flex-1 rounded-full border border-[var(--color-border)] px-3 py-2 font-sans text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import from Word
        </button>
      </div>

      <div
        onDragOver={(e) => {
          if (importing) return;
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          if (importing) return;
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => !importing && anyInputRef.current?.click()}
        className={`mt-3 rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
          importing
            ? "cursor-not-allowed border-[var(--color-border)] opacity-60"
            : `cursor-pointer ${dragActive ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)]" : "border-[var(--color-border)]"}`
        }`}
      >
        <p className="font-sans text-xs text-[var(--color-ink-muted)]">
          {importing ? "Importing…" : "Drag and drop a file here, or click to browse"}
        </p>
        <p className="mt-1 font-mono text-[10px] text-[var(--color-ink-muted)]">
          PDF, Word, or text · up to {MAX_FILE_MB}MB
        </p>
      </div>

      {error && <p className="mt-3 font-mono text-[11px] text-red-600">{error}</p>}

      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        disabled={importing}
        className="hidden"
        onChange={onFileInputChange}
      />
      <input
        ref={wordInputRef}
        type="file"
        accept=".doc,.docx"
        disabled={importing}
        className="hidden"
        onChange={onFileInputChange}
      />
      <input
        ref={anyInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md"
        disabled={importing}
        className="hidden"
        onChange={onFileInputChange}
      />
    </Modal>
  );
}
