"use client";

import { useEffect, useState } from "react";
import { LANGUAGES, TONES } from "@/lib/constants";

type GenerateModalProps = {
  open: boolean;
  onClose: () => void;
  onGenerate: (instruction: string) => void;
  isThinking: boolean;
  hasApiKey: boolean;
  lifetimeAccess: boolean;
  creditsRemaining: number;
  onOpenSettings: () => void;
};

const TOPIC_MAX = 300;
const KEYWORDS_MAX = 2500;

export function buildInstruction(language: string, tone: string, topic: string, keywords: string): string {
  const lines = [
    `Write a new section for this document about: "${topic.trim()}".`,
    `Use a ${tone.toLowerCase()} tone/voice.`,
  ];
  if (language !== "English") lines.push(`Write it in ${language}.`);
  if (keywords.trim()) lines.push(`Naturally incorporate these keywords where relevant: ${keywords.trim()}.`);
  return lines.join(" ");
}

export default function GenerateModal({
  open,
  onClose,
  onGenerate,
  isThinking,
  hasApiKey,
  lifetimeAccess,
  creditsRemaining,
  onOpenSettings,
}: GenerateModalProps) {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const canGenerate = topic.trim().length > 0 && !isThinking;

  function handleGenerate() {
    if (!canGenerate) return;
    onGenerate(buildInstruction(language, tone, topic, keywords));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-6 shadow-lg"
      >
        <div>
          <h2 className="font-serif text-xl font-semibold text-[var(--color-ink)]">What are we writing today?</h2>
          <p className="mt-1 font-sans text-[13px] text-[var(--color-ink-muted)]">
            Describe a topic and HandWrought will draft an opening section — or skip straight to a blank page.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <textarea
            autoFocus
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, TOPIC_MAX))}
            placeholder="e.g. Why remote teams need async rituals"
            rows={2}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-inset)] px-3 py-2.5 font-sans text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]"
          />
          <span className="self-end font-mono text-[10px] text-[var(--color-ink-muted)]">
            {topic.length}/{TOPIC_MAX}
          </span>
        </label>

        <button
          type="button"
          onClick={() => setOptionsOpen((o) => !o)}
          className="self-start font-sans text-xs font-medium text-[var(--color-accent)]"
        >
          {optionsOpen ? "Hide options" : "Language, tone & keywords"}
        </button>

        {optionsOpen && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-inset)] p-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-[12px] font-medium text-[var(--color-ink)]">Language</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-[12px] font-medium text-[var(--color-ink)]">Tone</span>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[12px] font-medium text-[var(--color-ink)]">Keywords</span>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value.slice(0, KEYWORDS_MAX))}
                placeholder="e.g. async work, distributed teams, focus time"
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]"
              />
            </label>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
          >
            {isThinking ? "Generating…" : "Start writing"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full font-sans text-xs text-[var(--color-ink-muted)] underline-offset-2 hover:underline"
          >
            Skip, just let me write
          </button>
        </div>

        <p className="text-center font-sans text-[12px] text-[var(--color-ink-muted)]">
          {hasApiKey ? (
            "Using your own Gemini key — unlimited generations."
          ) : lifetimeAccess ? (
            "Lifetime access — unlimited generations with HandWrought's key."
          ) : (
            <>
              Using HandWrought&apos;s key — {creditsRemaining} free {creditsRemaining === 1 ? "try" : "tries"} left.{" "}
              <button type="button" onClick={onOpenSettings} className="text-[var(--color-accent)] underline">
                Bring your own key instead
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
