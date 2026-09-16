// Algorithmic city/settlement name generator. Era drives the word-bank pool;
// atmosphere drives which suffix mood that pool leans into. See
// lib/tools/wordBank.ts for the shared combination logic.

import { generateWords, type Mood, type WordPool } from "@/lib/tools/wordBank";

export const CITY_ERAS = ["Medieval", "Modern", "Futuristic"] as const;
export type CityEra = (typeof CITY_ERAS)[number];

export const CITY_ATMOSPHERES = ["Eerie", "Welcoming", "Industrial", "Bustling", "Forgotten"] as const;
export type CityAtmosphere = (typeof CITY_ATMOSPHERES)[number];

const ATMOSPHERE_MOOD: Record<CityAtmosphere, Mood> = {
  Eerie: "mystic",
  Welcoming: "soft",
  Industrial: "harsh",
  Bustling: "soft",
  Forgotten: "mystic",
};

const POOLS: Record<CityEra, WordPool> = {
  Medieval: {
    onsets: ["Wren", "Thorn", "Aldern", "Bram", "Cole", "Dun", "Elm", "Fen", "Grey", "Hart", "Ives", "Kest", "Lang", "Mor", "Norwic", "Old"],
    middles: ["", "en", "ing", "es", "in"],
    suffixes: [
      { text: "bury", mood: "soft" },
      { text: "ford", mood: "harsh" },
      { text: "wick", mood: "mystic" },
      { text: "stead", mood: "soft" },
      { text: "holt", mood: "soft" },
      { text: "mere", mood: "soft" },
      { text: "gate", mood: "harsh" },
      { text: "keep", mood: "harsh" },
      { text: "moor", mood: "mystic" },
      { text: "fen", mood: "mystic" },
    ],
  },
  Modern: {
    onsets: ["Bay", "Cedar", "Elm", "Fair", "Green", "Harbor", "Iron", "Lake", "Maple", "North", "Oak", "Park", "Ridge", "South", "Stone", "West"],
    // Weighted heavily toward "" — onsets and suffixes are already full
    // words here, so a non-empty middle should be the occasional flourish,
    // not the norm, or results balloon into "Harborfieldcrest"-length names.
    middles: ["", "", "", "", "", "field", "wood", "ford"],
    suffixes: [
      { text: "ville", mood: "soft" },
      { text: "town", mood: "soft" },
      { text: "burg", mood: "harsh" },
      { text: "port", mood: "harsh" },
      { text: "side", mood: "soft" },
      { text: "view", mood: "soft" },
      { text: "crest", mood: "harsh" },
      { text: "junction", mood: "harsh" },
    ],
  },
  Futuristic: {
    // "Nova" deliberately excluded from onsets — it's also a suffix below,
    // and onset+suffix both being "nova" produced ugly collisions like
    // "Novaennova".
    onsets: ["Neo", "Cy", "Vex", "Arc", "Zen", "Quan", "Hal", "Ilo", "Tesla", "Vertex", "Skye"],
    // Same reasoning as Modern above — onsets/suffixes are already full,
    // tech-flavored words, so stacking a middle syllable between two of them
    // ("Vertexenspire") should be rare, not the default.
    middles: ["", "", "", "", "o"],
    suffixes: [
      { text: "polis", mood: "harsh" },
      { text: "grid", mood: "harsh" },
      { text: "spire", mood: "mystic" },
      { text: "dome", mood: "soft" },
      { text: "sector", mood: "harsh" },
      { text: "node", mood: "harsh" },
      { text: "haven", mood: "soft" },
      { text: "nova", mood: "mystic" },
    ],
  },
};

export type GenerateCityNamesOptions = {
  era: CityEra;
  atmosphere: CityAtmosphere;
  region?: string;
  count?: number;
};

/** City/settlement names — algorithmic, client-safe, instant. */
export function generateCityNames({ era, atmosphere, region, count = 10 }: GenerateCityNamesOptions): string[] {
  return generateWords({ pool: POOLS[era], mood: ATMOSPHERE_MOOD[atmosphere], seed: region, count });
}
