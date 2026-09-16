"use client";

import { useState } from "react";
import Link from "next/link";
import {
  NATION_GENRES,
  NATION_TONES,
  GOVERNMENT_TYPES,
  generateNationNames,
  withGovernmentType,
  type NationGenre,
  type NationTone,
  type GovernmentType,
} from "@/lib/tools/nationNames";
import { trackToolGenerate, trackCtaClick, recordToolReferral } from "@/lib/analytics";

const TOOL_NAME = "nation-name-generator";

const selectClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2.5 font-sans text-sm text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none";
const labelClass = "font-sans text-xs font-medium text-[var(--color-ink-muted)]";

export default function NationGeneratorWidget() {
  const [genre, setGenre] = useState<NationGenre>("Fantasy");
  const [tone, setTone] = useState<NationTone>("Peaceful");
  const [seed, setSeed] = useState("");
  const [governmentType, setGovernmentType] = useState<GovernmentType>("None");
  const [baseNames, setBaseNames] = useState<string[]>([]);

  function handleGenerate() {
    setBaseNames(generateNationNames({ genre, tone, seed: seed.trim() || undefined, count: 10 }));
    trackToolGenerate(TOOL_NAME);
  }

  function handleCtaClick(placement: string) {
    trackCtaClick(TOOL_NAME, placement);
    recordToolReferral(TOOL_NAME);
  }

  const displayNames = baseNames.map((n) => withGovernmentType(n, governmentType));
  const hasGenerated = baseNames.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-inset)] p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Genre / style</span>
            <select className={selectClass} value={genre} onChange={(e) => setGenre(e.target.value as NationGenre)}>
              {NATION_GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Tone</span>
            <select className={selectClass} value={tone} onChange={(e) => setTone(e.target.value as NationTone)}>
              {NATION_TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Cultural / linguistic seed word (optional)</span>
            <input
              type="text"
              className={selectClass}
              placeholder="e.g. Kael, Norrath, Sundari"
              value={seed}
              maxLength={30}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Government type</span>
            <select
              className={selectClass}
              value={governmentType}
              onChange={(e) => setGovernmentType(e.target.value as GovernmentType)}
            >
              {GOVERNMENT_TYPES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="mt-4 w-full rounded-md bg-[var(--color-accent)] px-4 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] sm:w-auto"
        >
          {hasGenerated ? "Generate more names" : "Generate nation names"}
        </button>
      </div>

      {hasGenerated && (
        <div className="flex flex-wrap gap-2">
          {displayNames.map((displayName) => (
            <span
              key={displayName}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-2 font-serif text-sm font-semibold text-[var(--color-ink)]"
            >
              {displayName}
            </span>
          ))}
        </div>
      )}

      {hasGenerated && (
        <div className="rounded-lg border border-[var(--color-accent-tint-border)] bg-[var(--color-accent-tint)] p-4 sm:p-5">
          <p className="font-sans text-sm leading-relaxed text-[var(--color-ink)]">
            Like <span className="font-semibold">{displayNames[0]}</span>? Write its full history, culture, and
            politics right inside your manuscript with HandWrought — free to try.
          </p>
          <Link
            href="/?utm_source=tools&utm_medium=free_tool&utm_campaign=nation-name-generator"
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
