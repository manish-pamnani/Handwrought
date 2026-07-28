"use client";

import { useState } from "react";
import { LANGUAGES, TONES } from "@/lib/constants";

type GeneratorPanelProps = {
  onGenerate: (instruction: string) => void;
  isThinking: boolean;
  hasApiKey: boolean;
  onOpenSettings: () => void;
};

const TOPIC_MAX = 300;
const KEYWORDS_MAX = 2500;

function buildInstruction(language: string, tone: string, topic: string, keywords: string): string {
  const lines = [
    `Write a new section for this document about: "${topic.trim()}".`,
    `Use a ${tone.toLowerCase()} tone/voice.`,
  ];
  if (language !== "English") lines.push(`Write it in ${language}.`);
  if (keywords.trim()) lines.push(`Naturally incorporate these keywords where relevant: ${keywords.trim()}.`);
  return lines.join(" ");
}

export default function GeneratorPanel({ onGenerate, isThinking, hasApiKey, onOpenSettings }: GeneratorPanelProps) {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");

  const canGenerate = topic.trim().length > 0 && !isThinking && hasApiKey;

  function handleGenerate() {
    if (!canGenerate) return;
    onGenerate(buildInstruction(language, tone, topic, keywords));
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-[var(--color-paper-inset)] p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">Select language</span>
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
          <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">Select tone/voice</span>
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
        <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">
          Section header or topic <span className="text-red-500">*</span>
        </span>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, TOPIC_MAX))}
          placeholder="e.g. Why remote teams need async rituals"
          rows={2}
          className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]"
        />
        <span className="self-end font-mono text-[10px] text-[var(--color-ink-muted)]">
          {topic.length}/{TOPIC_MAX}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-sans text-[13px] font-medium text-[var(--color-ink)]">Section keywords</span>
        <textarea
          value={keywords}
          onChange={(e) => setKeywords(e.target.value.slice(0, KEYWORDS_MAX))}
          placeholder="e.g. async work, distributed teams, focus time"
          rows={4}
          className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 py-2 font-sans text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]"
        />
        <span className="self-end font-mono text-[10px] text-[var(--color-ink-muted)]">
          {keywords.length}/{KEYWORDS_MAX}
        </span>
      </label>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {!hasApiKey && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-left font-sans text-xs text-[var(--color-accent)] underline"
          >
            Add your Gemini API key in Settings to generate text.
          </button>
        )}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
        >
          {isThinking ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
