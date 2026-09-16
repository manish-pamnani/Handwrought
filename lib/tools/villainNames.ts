// Algorithmic villain/antagonist name generator. Three genres (Dark Fantasy,
// Sci-Fi, Horror) build invented surnames from word-bank pools, same
// technique as lib/tools/nationNames.ts. Crime is deliberately different —
// crime villains read as real people, not invented words — so it draws from
// realistic given-name/surname/epithet pools instead ("Vinnie 'Razor'
// Caruso"). See lib/tools/wordBank.ts for the shared combination logic.

import { generateWords, pick, type Mood, type WordPool } from "@/lib/tools/wordBank";

export const VILLAIN_GENRES = ["Dark Fantasy", "Sci-Fi", "Horror", "Crime"] as const;
export type VillainGenre = (typeof VILLAIN_GENRES)[number];

export const VILLAIN_GENDERS = ["Any", "Feminine", "Masculine"] as const;
export type VillainGender = (typeof VILLAIN_GENDERS)[number];

type TitleEntry = { text: string; gender?: "Feminine" | "Masculine" };

type InventedGenreConfig = {
  style: "invented";
  pool: WordPool;
  mood: Mood;
  feminineGiven: string[];
  masculineGiven: string[];
  titles: TitleEntry[];
};

type RealisticGenreConfig = {
  style: "realistic";
  surnames: string[];
  feminineGiven: string[];
  masculineGiven: string[];
  titles: TitleEntry[];
  epithets: string[];
};

const CONFIG: Record<VillainGenre, InventedGenreConfig | RealisticGenreConfig> = {
  "Dark Fantasy": {
    style: "invented",
    pool: {
      onsets: ["Mal", "Vor", "Krev", "Sil", "Drac", "Nyx", "Mor", "Ash", "Grim", "Vex", "Ren", "Kael", "Zar", "Quel"],
      middles: ["", "a", "o", "e", "an", "or", "ith"],
      suffixes: [
        { text: "thorn", mood: "harsh" },
        { text: "mire", mood: "harsh" },
        { text: "wraith", mood: "mystic" },
        { text: "bane", mood: "harsh" },
        { text: "shade", mood: "mystic" },
        { text: "grave", mood: "harsh" },
        { text: "veil", mood: "mystic" },
        { text: "fang", mood: "harsh" },
        { text: "gloom", mood: "mystic" },
        { text: "eth", mood: "mystic" },
        { text: "mourn", mood: "soft" },
        { text: "dread", mood: "harsh" },
      ],
    },
    mood: "harsh",
    feminineGiven: ["Mara", "Isolde", "Raven", "Selene", "Lilith", "Vesper", "Thessaly", "Ysolde"],
    masculineGiven: ["Dorian", "Silas", "Malachar", "Ronan", "Cassius", "Varek", "Emeric", "Thane"],
    titles: [
      { text: "Lord", gender: "Masculine" },
      { text: "Lady", gender: "Feminine" },
      { text: "The" },
      { text: "Archduke", gender: "Masculine" },
      { text: "Archduchess", gender: "Feminine" },
      { text: "The Undying" },
    ],
  },
  "Sci-Fi": {
    style: "invented",
    pool: {
      onsets: ["Zex", "Kryo", "Vor", "Nyx", "Cal", "Drax", "Sek", "Ilon", "Rhaz", "Vek", "Quon", "Tal"],
      middles: ["", "o", "ar", "en", "ix"],
      suffixes: [
        { text: "tron", mood: "harsh" },
        { text: "ix", mood: "harsh" },
        { text: "os", mood: "harsh" },
        { text: "drex", mood: "harsh" },
        { text: "nova", mood: "mystic" },
        { text: "void", mood: "mystic" },
        { text: "core", mood: "harsh" },
        { text: "cipher", mood: "mystic" },
        { text: "vane", mood: "soft" },
      ],
    },
    mood: "harsh",
    feminineGiven: ["Nyra", "Zara", "Cassia", "Kira-9", "Vex-7", "Ilona"],
    masculineGiven: ["Kade", "Draven", "Talon", "Rex", "Cyrus", "Magnus"],
    titles: [
      { text: "Commander" },
      { text: "Director" },
      { text: "The" },
      { text: "Overseer" },
      { text: "Warlord" },
      { text: "Chairman", gender: "Masculine" },
      { text: "Chairwoman", gender: "Feminine" },
    ],
  },
  Horror: {
    style: "invented",
    pool: {
      onsets: ["Grim", "Rot", "Bleak", "Cain", "Hex", "Mourn", "Vale", "Sever", "Weep", "Coil", "Gaunt"],
      middles: ["", "o", "e", "en"],
      suffixes: [
        { text: "wick", mood: "mystic" },
        { text: "maw", mood: "harsh" },
        { text: "hollow", mood: "mystic" },
        { text: "crypt", mood: "harsh" },
        { text: "shroud", mood: "mystic" },
        { text: "gore", mood: "harsh" },
        { text: "rend", mood: "harsh" },
        { text: "husk", mood: "harsh" },
      ],
    },
    mood: "mystic",
    feminineGiven: ["Agatha", "Lenore", "Evangeline", "Ophelia", "Marceline"],
    masculineGiven: ["Ambrose", "Elias", "Victor", "Jeremiah", "Cornelius"],
    titles: [{ text: "Doctor" }, { text: "The" }, { text: "Reverend" }, { text: "Widow", gender: "Feminine" }, { text: "Undertaker" }],
  },
  Crime: {
    style: "realistic",
    surnames: ["Caruso", "Marchetti", "Vega", "Kessler", "Duvall", "Okafor", "Reyes", "Sorrento", "Callahan", "Petrov"],
    feminineGiven: ["Roxy", "Vera", "Nadia", "Sasha", "Camille", "Delphine"],
    masculineGiven: ["Vinnie", "Marco", "Deke", "Nico", "Frank", "Tino"],
    titles: [{ text: "Don", gender: "Masculine" }, { text: "Madame", gender: "Feminine" }, { text: "The" }],
    epithets: ["Razor", "Ghost", "Ice", "Wolf", "Viper", "Butcher", "Snake", "Shade"],
  },
};

function pickTitle(titles: TitleEntry[], gender: VillainGender): string {
  const eligible = gender === "Any" ? titles : titles.filter((t) => !t.gender || t.gender === gender);
  return pick(eligible.length > 0 ? eligible : titles).text;
}

function pickGiven(config: InventedGenreConfig | RealisticGenreConfig, gender: VillainGender): string {
  if (gender === "Masculine") return pick(config.masculineGiven);
  if (gender === "Feminine") return pick(config.feminineGiven);
  return pick([...config.feminineGiven, ...config.masculineGiven]);
}

export type GenerateVillainNamesOptions = {
  genre: VillainGenre;
  theme?: string;
  gender: VillainGender;
  count?: number;
};

/** Villain names — algorithmic, client-safe, instant. */
export function generateVillainNames({ genre, theme, gender, count = 10 }: GenerateVillainNamesOptions): string[] {
  const config = CONFIG[genre];
  const names = new Set<string>();
  let attempts = 0;

  while (names.size < count && attempts < count * 20) {
    attempts++;
    const surname = config.style === "realistic" ? pick(config.surnames) : generateWords({ pool: config.pool, mood: config.mood, seed: theme, count: 1 })[0];
    const useTitle = Math.random() < 0.3;
    const title = useTitle ? pickTitle(config.titles, gender) : null;
    // A stand-alone epithet-style title ("The", "The Undying") reads fine
    // directly on the surname ("The Undying Shadomire") but not stacked with
    // a given name ("The Undying Ysolde Shadomire" doesn't parse as a name).
    const titleIsStandalone = title?.startsWith("The") ?? false;
    const useGiven = !titleIsStandalone && (config.style === "realistic" || Math.random() < 0.5);
    const useEpithet = config.style === "realistic" && Math.random() < 0.3;

    const parts: string[] = [];
    if (title) parts.push(title);
    if (useGiven) parts.push(pickGiven(config, gender));
    if (useEpithet && config.style === "realistic") parts.push(`"${pick(config.epithets)}"`);
    parts.push(surname);

    names.add(parts.join(" "));
  }

  return Array.from(names);
}
