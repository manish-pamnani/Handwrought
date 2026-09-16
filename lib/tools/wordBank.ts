// Shared phonotactic word-bank machinery for the free-tools generators
// (lib/tools/nationNames.ts, villainNames.ts, planetNames.ts, cityNames.ts).
// Pure functions, no API calls — safe to run in the browser.

export type Mood = "soft" | "harsh" | "mystic";

export type SuffixEntry = { text: string; mood: Mood };

export type WordPool = {
  onsets: string[];
  middles: string[]; // may include "" so a name can skip straight to the suffix
  suffixes: SuffixEntry[];
};

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function sanitizeSeed(seed: string): string {
  return seed.replace(/[^a-zA-Z]/g, "");
}

/** Picks a suffix leaning toward `mood` ~70% of the time; otherwise draws from the full pool so results don't feel mechanically filtered. */
export function pickSuffix(pool: WordPool, mood: Mood): string {
  const preferred = pool.suffixes.filter((s) => s.mood === mood);
  const useMood = preferred.length > 0 && Math.random() < 0.7;
  return (useMood ? pick(preferred) : pick(pool.suffixes)).text;
}

export type GenerateWordOptions = {
  pool: WordPool;
  mood: Mood;
  seed?: string;
  count: number;
  minLength?: number;
  maxLength?: number;
};

/**
 * Combines onset + middle + mood-weighted suffix into `count` unique
 * capitalized words. If `seed` is given, up to 2 results use it directly as
 * the onset instead of drawing from the pool — the "your seed actually
 * mattered" signal, without letting it dominate every result.
 */
export function generateWords({ pool, mood, seed, count, minLength = 4, maxLength = 16 }: GenerateWordOptions): string[] {
  const cleanSeed = seed ? sanitizeSeed(seed) : "";
  const words = new Set<string>();
  const seedSlots = cleanSeed.length >= 2 ? Math.min(2, count) : 0;

  let attempts = 0;
  while (words.size < count && attempts < count * 20) {
    attempts++;
    const useSeed = words.size < seedSlots;
    const onset = useSeed ? capitalize(cleanSeed.slice(0, Math.min(5, cleanSeed.length))) : pick(pool.onsets);
    const middle = useSeed ? "" : pick(pool.middles);
    const suffix = pickSuffix(pool, mood);
    const word = capitalize(`${onset}${middle}${suffix}`.toLowerCase());
    if (word.length >= minLength && word.length <= maxLength) words.add(word);
  }

  return Array.from(words);
}
