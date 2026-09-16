"use client";

import { useState } from "react";
import Link from "next/link";
import {
  VILLAIN_GENRES,
  VILLAIN_GENDERS,
  generateVillainNames,
  type VillainGenre,
  type VillainGender,
} from "@/lib/tools/villainNames";
import { trackToolGenerate, trackCtaClick, recordToolReferral } from "@/lib/analytics";

const TOOL_NAME = "villain-name-generator";

const selectClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2.5 font-sans text-sm text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none";
const labelClass = "font-sans text-xs font-medium text-[var(--color-ink-muted)]";

export default function VillainGeneratorWidget() {
  const [genre, setGenre] = useState<VillainGenre>("Dark Fantasy");
  const [theme, setTheme] = useState("");
  const [gender, setGender] = useState<VillainGender>("Any");
  const [names, setNames] = useState<string[]>([]);

  function handleGenerate() {
    setNames(generateVillainNames({ genre, theme: theme.trim() || undefined, gender, count: 10 }));
    trackToolGenerate(TOOL_NAME);
  }

  function handleCtaClick(placement: string) {
    trackCtaClick(TOOL_NAME, placement);
    recordToolReferral(TOOL_NAME);
  }

  const hasGenerated = names.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-inset)] p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Genre</span>
            <select className={selectClass} value={genre} onChange={(e) => setGenre(e.target.value as VillainGenre)}>
              {VILLAIN_GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Gender preference</span>
            <select className={selectClass} value={gender} onChange={(e) => setGender(e.target.value as VillainGender)}>
              {VILLAIN_GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelClass}>Theme / keyword (optional)</span>
            <input
              type="text"
              className={selectClass}
              placeholder="e.g. shadow, fire, cyber"
              value={theme}
              maxLength={30}
              onChange={(e) => setTheme(e.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="mt-4 w-full rounded-md bg-[var(--color-accent)] px-4 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] sm:w-auto"
        >
          {hasGenerated ? "Generate more villains" : "Generate villain names"}
        </button>
      </div>

      {hasGenerated && (
        <div className="flex flex-wrap gap-2">
          {names.map((name) => (
            <span
              key={name}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-2 font-serif text-sm font-semibold text-[var(--color-ink)]"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {hasGenerated && (
        <div className="rounded-lg border border-[var(--color-accent-tint-border)] bg-[var(--color-accent-tint)] p-4 sm:p-5">
          <p className="font-sans text-sm leading-relaxed text-[var(--color-ink)]">
            Ready to write <span className="font-semibold">{names[0]}</span>&apos;s first scene? Draft it with AI
            feedback in real time — try HandWrought free.
          </p>
          <Link
            href="/?utm_source=tools&utm_medium=free_tool&utm_campaign=villain-name-generator"
            onClick={() => handleCtaClick("after_generate")}
            className="mt-3 inline-block rounded-md bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Try HandWrought free
          </Link>
        </div>
      )}
    </div>
  );
}
