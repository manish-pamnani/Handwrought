// Algorithmic nation/country name generator — see lib/tools/wordBank.ts for
// the shared combination logic. The AI-written flavor paragraph (see
// app/api/tools/flavor-paragraph/route.ts) is the actual differentiator;
// this file only needs to produce names that already sound plausible on
// their own, per style/tone, before any AI touches them.

import { generateWords, type Mood, type WordPool } from "@/lib/tools/wordBank";

export const NATION_GENRES = ["Fantasy", "Sci-Fi", "Historical", "Modern", "Tribal"] as const;
export type NationGenre = (typeof NATION_GENRES)[number];

export const NATION_TONES = ["Peaceful", "War-torn", "Mystical", "Prosperous", "Isolationist", "Industrious"] as const;
export type NationTone = (typeof NATION_TONES)[number];

export const GOVERNMENT_TYPES = ["None", "Kingdom", "Republic", "Federation", "Empire"] as const;
export type GovernmentType = (typeof GOVERNMENT_TYPES)[number];

// Tone -> which suffix mood to lean into.
const TONE_MOOD: Record<NationTone, Mood> = {
  Peaceful: "soft",
  Prosperous: "soft",
  "War-torn": "harsh",
  Isolationist: "harsh",
  Industrious: "harsh",
  Mystical: "mystic",
};

const POOLS: Record<NationGenre, WordPool> = {
  Fantasy: {
    onsets: ["Al", "Bel", "Cor", "Dun", "El", "Fen", "Gal", "Hal", "Is", "Kar", "Lor", "Mor", "Nor", "Or", "Pel", "Quor", "Rav", "Sel", "Thal", "Val", "Wyn", "Yl", "Zar"],
    middles: ["", "a", "ae", "i", "o", "an", "en", "or", "el"],
    suffixes: [
      { text: "dor", mood: "harsh" },
      { text: "mar", mood: "harsh" },
      { text: "gard", mood: "harsh" },
      { text: "thas", mood: "harsh" },
      { text: "wyn", mood: "soft" },
      { text: "ria", mood: "soft" },
      { text: "vale", mood: "soft" },
      { text: "mere", mood: "soft" },
      { text: "heim", mood: "harsh" },
      { text: "ael", mood: "mystic" },
      { text: "oth", mood: "mystic" },
      { text: "ynn", mood: "mystic" },
      { text: "thys", mood: "mystic" },
      { text: "loth", mood: "mystic" },
      { text: "and", mood: "soft" },
      { text: "more", mood: "harsh" },
    ],
  },
  "Sci-Fi": {
    onsets: ["Ax", "Cy", "Dex", "Ex", "Ilo", "Ju", "Ky", "Lux", "Nex", "Orb", "Pri", "Quan", "Rho", "Sol", "Tek", "Ux", "Vex", "Xen", "Zer"],
    middles: ["", "o", "a", "i", "on", "ar", "en"],
    suffixes: [
      { text: "os", mood: "harsh" },
      { text: "ix", mood: "harsh" },
      { text: "on", mood: "harsh" },
      { text: "ara", mood: "soft" },
      { text: "ion", mood: "soft" },
      { text: "ith", mood: "mystic" },
      { text: "yss", mood: "mystic" },
      { text: "aris", mood: "soft" },
      { text: "ora", mood: "soft" },
      { text: "grid", mood: "harsh" },
      { text: "forge", mood: "harsh" },
      { text: "nova", mood: "mystic" },
      { text: "prime", mood: "harsh" },
      { text: "vale", mood: "soft" },
    ],
  },
  Historical: {
    onsets: ["An", "Bra", "Car", "Dan", "Est", "Fri", "Gol", "Hel", "Ith", "Jov", "Kes", "Lys", "Mag", "Nov", "Ost", "Pol", "Rus", "Sar", "Tir", "Val"],
    middles: ["", "a", "e", "i", "o", "en", "on"],
    suffixes: [
      { text: "ia", mood: "soft" },
      { text: "stan", mood: "harsh" },
      { text: "thia", mood: "soft" },
      { text: "berg", mood: "harsh" },
      { text: "grad", mood: "harsh" },
      { text: "mark", mood: "harsh" },
      { text: "land", mood: "soft" },
      { text: "avia", mood: "soft" },
      { text: "oria", mood: "mystic" },
      { text: "ath", mood: "mystic" },
      { text: "burg", mood: "harsh" },
      { text: "esse", mood: "soft" },
    ],
  },
  Modern: {
    onsets: ["Ash", "Bright", "Cedar", "Del", "East", "Fair", "Green", "High", "Iron", "Lake", "North", "Oak", "Port", "Ridge", "South", "Stone", "Vale", "West"],
    // Weighted heavily toward "" — onsets and suffixes here are already full
    // words (unlike the syllable-fragment genres above), so stacking a third
    // word via `middle` should be the occasional flourish, not the norm, or
    // results balloon into "Delfieldpoint"/"Cedarfordunion"-length names.
    middles: ["", "", "", "", "en", "wood", "field", "ford"],
    suffixes: [
      { text: "land", mood: "soft" },
      { text: "shire", mood: "soft" },
      { text: "burg", mood: "harsh" },
      { text: "ton", mood: "soft" },
      { text: "haven", mood: "soft" },
      { text: "point", mood: "harsh" },
      { text: "reach", mood: "harsh" },
      { text: "union", mood: "harsh" },
      { text: "coast", mood: "soft" },
      { text: "cross", mood: "harsh" },
      { text: "hollow", mood: "mystic" },
      { text: "rise", mood: "mystic" },
    ],
  },
  Tribal: {
    onsets: ["Ka", "Mba", "Nga", "Oro", "Tal", "Uku", "Vai", "Wan", "Xol", "Yara", "Zul", "Iri", "Koa", "Nomo", "Puna", "Tama"],
    middles: ["", "a", "i", "o", "u", "ka", "na"],
    suffixes: [
      { text: "toa", mood: "harsh" },
      { text: "kesh", mood: "harsh" },
      { text: "wai", mood: "soft" },
      { text: "moto", mood: "soft" },
      { text: "nga", mood: "harsh" },
      { text: "lei", mood: "soft" },
      { text: "run", mood: "harsh" },
      { text: "kara", mood: "mystic" },
      { text: "vou", mood: "mystic" },
      { text: "tep", mood: "harsh" },
      { text: "ora", mood: "soft" },
      { text: "iti", mood: "soft" },
    ],
  },
};

export type GenerateNationNamesOptions = {
  genre: NationGenre;
  tone: NationTone;
  seed?: string;
  count?: number;
};

/** Base nation names (no government-type wrapping) — algorithmic, client-safe, instant. */
export function generateNationNames({ genre, tone, seed, count = 10 }: GenerateNationNamesOptions): string[] {
  return generateWords({ pool: POOLS[genre], mood: TONE_MOOD[tone], seed, count });
}

/** Wraps a base name with the chosen government-type phrasing (or returns it unwrapped for "None"). */
export function withGovernmentType(name: string, governmentType: GovernmentType): string {
  switch (governmentType) {
    case "Kingdom":
      return `Kingdom of ${name}`;
    case "Republic":
      return `Republic of ${name}`;
    case "Federation":
      return `${name} Federation`;
    case "Empire":
      return `${name} Empire`;
    default:
      return name;
  }
}
