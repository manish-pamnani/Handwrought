"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PLANET_TYPES,
  PLANET_GENRES,
  generatePlanetNames,
  type PlanetType,
  type PlanetGenre,
} from "@/lib/tools/planetNames";
import { trackToolGenerate, trackCtaClick, recordToolReferral } from "@/lib/analytics";

const TOOL_NAME = "planet-name-generator";

const selectClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2.5 font-sans text-sm text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none";
const labelClass = "font-sans text-xs font-medium text-[var(--color-ink-muted)]";

export default function PlanetGeneratorWidget() {
  const [planetType, setPlanetType] = useState<PlanetType>("Desert");
  const [genre, setGenre] = useState<PlanetGenre>("Space Opera");
  const [inspiration, setInspiration] = useState("");
  const [names, setNames] = useState<string[]>([]);

  function handleGenerate() {
    setNames(generatePlanetNames({ genre, planetType, inspiration: inspiration.trim() || undefined, count: 10 }));
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
            <span className={labelClass}>Planet type</span>
            <select className={selectClass} value={planetType} onChange={(e) => setPlanetType(e.target.value as PlanetType)}>
              {PLANET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Genre</span>
            <select className={selectClass} value={genre} onChange={(e) => setGenre(e.target.value as PlanetGenre)}>
              {PLANET_GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelClass}>Cultural / mythological inspiration (optional)</span>
            <input
              type="text"
              className={selectClass}
              placeholder="e.g. Norse myth, coral reefs, silk trade"
              value={inspiration}
              maxLength={30}
              onChange={(e) => setInspiration(e.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="mt-4 w-full rounded-md bg-[var(--color-accent)] px-4 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] sm:w-auto"
        >
          {hasGenerated ? "Generate more planets" : "Generate planet names"}
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
            Want to describe <span className="font-semibold">{names[0]}</span>&apos;s landscape and atmosphere in
            full? Keep writing with HandWrought — free to try.
          </p>
          <Link
            href="/?utm_source=tools&utm_medium=free_tool&utm_campaign=planet-name-generator"
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
