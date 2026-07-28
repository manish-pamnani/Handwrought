"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  apiKey: string | null;
  onSave: (key: string) => void;
  onClear: () => void;
};

const inputClasses =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]";

export default function SettingsModal({ open, onClose, apiKey, onSave, onClear }: SettingsModalProps) {
  const [draft, setDraft] = useState(apiKey ?? "");
  const [showKey, setShowKey] = useState(false);

  // Reset the draft to the saved key each time the modal opens (rather than
  // in an effect — this is React's recommended "adjust state during render"
  // pattern for resetting state on a prop transition).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(apiKey ?? "");
  }

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  }

  function handleClear() {
    onClear();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Gemini API key">
      <div className="flex flex-col gap-3">
        <p className="font-sans text-[13px] text-[var(--color-ink-muted)]">
          HandWrought is bring-your-own-key: you supply a Gemini API key and generation requests run against your own
          quota.{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-accent)] underline"
          >
            Get a free Gemini API key →
          </a>{" "}
          then paste it below.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">API key</span>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="AIza…"
              className={inputClasses}
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="shrink-0 rounded-md border border-[var(--color-border)] px-2.5 font-sans text-xs text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <p className="font-sans text-[12px] text-[var(--color-ink-muted)]">
          Your key is stored only in this browser and sent directly to power your own requests. It&apos;s never saved
          on our servers.
        </p>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={!apiKey}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 font-sans text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)] disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!draft.trim()}
            className="rounded-full bg-[var(--color-accent)] px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
