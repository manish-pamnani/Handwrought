// Algorithmic planet name generator. Genre drives the word-bank pool (Hard
// Sci-Fi leans catalog/scientific, Space Opera leans mythic, Literary Sci-Fi
// leans grounded/poetic); planet type drives which suffix mood the genre
// pool leans into. See lib/tools/wordBank.ts for the shared combination logic.

import { generateWords, pick, type Mood, type WordPool } from "@/lib/tools/wordBank";

export const PLANET_TYPES = ["Gas Giant", "Desert", "Ocean", "Ice", "Volcanic"] as const;
export type PlanetType = (typeof PLANET_TYPES)[number];

export const PLANET_GENRES = ["Hard Sci-Fi", "Space Opera", "Literary Sci-Fi"] as const;
export type PlanetGenre = (typeof PLANET_GENRES)[number];

const TYPE_MOOD: Record<PlanetType, Mood> = {
  "Gas Giant": "mystic",
  Desert: "harsh",
  Ocean: "soft",
  Ice: "mystic",
  Volcanic: "harsh",
};

const POOLS: Record<PlanetGenre, WordPool> = {
  "Hard Sci-Fi": {
    onsets: ["Kep", "Tra", "Xen", "Vor", "Hyd", "Cor", "Pyx", "Wol", "Gli", "Arc", "Zel", "Quo"],
    middles: ["", "o", "a", "i", "ar"],
    suffixes: [
      { text: "on", mood: "harsh" },
      { text: "us", mood: "harsh" },
      { text: "is", mood: "soft" },
      { text: "ae", mood: "soft" },
      { text: "or", mood: "harsh" },
      { text: "yx", mood: "mystic" },
      { text: "al", mood: "soft" },
      { text: "ex", mood: "harsh" },
    ],
  },
  "Space Opera": {
    onsets: ["Xan", "Corel", "Thal", "Zeph", "Vael", "Ashka", "Dral", "Nyth", "Orin", "Kael", "Sera"],
    middles: ["", "a", "o", "en", "ar"],
    suffixes: [
      { text: "aris", mood: "soft" },
      { text: "os", mood: "harsh" },
      { text: "ion", mood: "soft" },
      { text: "ara", mood: "soft" },
      { text: "eth", mood: "mystic" },
      { text: "oth", mood: "mystic" },
      { text: "is", mood: "soft" },
      { text: "or", mood: "harsh" },
    ],
  },
  "Literary Sci-Fi": {
    onsets: ["Amber", "Low", "Salt", "Ash", "Pale", "Still", "Far", "Glass", "Quiet", "Wind", "Grey"],
    middles: ["", "", "en", "wood", "field"],
    suffixes: [
      { text: "reach", mood: "harsh" },
      { text: "hollow", mood: "mystic" },
      { text: "drift", mood: "soft" },
      { text: "fall", mood: "soft" },
      { text: "harbor", mood: "soft" },
      { text: "span", mood: "harsh" },
      { text: "rest", mood: "soft" },
      { text: "bloom", mood: "soft" },
    ],
  },
};

const ROMAN_NUMERALS = ["II", "III", "IV", "V", "VI", "VII"];
const CATALOG_DIGITS = ["2", "3", "4", "7", "9"];
const CATALOG_LETTERS = ["b", "c", "d", "e"];

/** ~60% of Hard Sci-Fi names get a real-astronomy-flavored designator (roman numeral, or a Kepler-186f-style catalog suffix). */
function withDesignator(name: string, genre: PlanetGenre): string {
  if (genre !== "Hard Sci-Fi" || Math.random() < 0.4) return name;
  return Math.random() < 0.5 ? `${name} ${pick(ROMAN_NUMERALS)}` : `${name}-${pick(CATALOG_DIGITS)}${pick(CATALOG_LETTERS)}`;
}

export type GeneratePlanetNamesOptions = {
  genre: PlanetGenre;
  planetType: PlanetType;
  inspiration?: string;
  count?: number;
};

/** Planet names — algorithmic, client-safe, instant. */
export function generatePlanetNames({ genre, planetType, inspiration, count = 10 }: GeneratePlanetNamesOptions): string[] {
  const base = generateWords({ pool: POOLS[genre], mood: TYPE_MOOD[planetType], seed: inspiration, count });
  return base.map((name) => withDesignator(name, genre));
}
