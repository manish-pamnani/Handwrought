import type { Metadata } from "next";
import Link from "next/link";
import ToolChrome from "@/components/tools/ToolChrome";
import PlanetGeneratorWidget from "@/components/tools/PlanetGeneratorWidget";

const TITLE = "Planet Name Generator — Free Sci-Fi World Names | HandWrought";
const DESCRIPTION = "Generate planet and world names for sci-fi writing — hard sci-fi, space opera, or literary sci-fi. Free, instant.";
const URL = "https://handwrought.online/tools/planet-name-generator/";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const EXAMPLE_PLANETS: { name: string; genre: string; blurb: string }[] = [
  { name: "Kepleros IV", genre: "Hard Sci-Fi", blurb: "Tidally locked ice world, colonized only along its permanent dusk line." },
  { name: "Traxis-7b", genre: "Hard Sci-Fi", blurb: "Volcanic moon mined for rare isotopes; atmosphere unbreathable." },
  { name: "Corvexis III", genre: "Hard Sci-Fi", blurb: "Ocean world under a canopy of permanent storm clouds." },
  { name: "Wolgaris-9c", genre: "Hard Sci-Fi", blurb: "Desert planet, three suns, no native life ever confirmed." },
  { name: "Xanaris", genre: "Space Opera", blurb: "Gas giant ringworld, home to a thousand-year trading dynasty." },
  { name: "Corelthys", genre: "Space Opera", blurb: "Desert homeworld of an empire that hasn't lost a war in five centuries." },
  { name: "Zephara", genre: "Space Opera", blurb: "Ocean world whose cities are built entirely on migrating kelp-forests." },
  { name: "Nythoria", genre: "Space Opera", blurb: "A floating city-state suspended in permanent storm bands." },
  { name: "Ambervale", genre: "Literary Sci-Fi", blurb: "Volcanic world settled by refugees who never meant to stay." },
  { name: "Lowreach", genre: "Literary Sci-Fi", blurb: "Desert planet, its wells rationed by an unwritten but absolute code." },
  { name: "Saltfall", genre: "Literary Sci-Fi", blurb: "Ocean world — the last generation ship's final, unplanned stop." },
  { name: "Pale Hollow", genre: "Literary Sci-Fi", blurb: "Ice moon, quietly abandoned, quietly still receiving mail." },
  { name: "Glassdrift", genre: "Literary Sci-Fi", blurb: "A gas giant whose atmosphere refracts light into what colonists call 'the glass hour.'" },
  { name: "Quiethollow-4d", genre: "Hard Sci-Fi", blurb: "Uninhabitable, but its telemetry keeps changing in ways no one can explain." },
  { name: "Vaelothis", genre: "Space Opera", blurb: "Ice world sacred to a religion older than its own written language." },
  { name: "Farreach", genre: "Literary Sci-Fi", blurb: "The planet the maps stop naming past a certain longitude." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "How do real astronomers name planets?",
    a: "Exoplanets get a working designation first: the host star's catalog name plus a lowercase letter in order of discovery — the star itself is implicitly \"a,\" so the first planet found is \"b\" (Kepler-186f is the fifth planet found around Kepler-186). A tiny fraction later get a real name through the IAU's public NameExoWorlds process. Solar system planets and moons follow older mythological conventions — Roman gods for the planets, moons typically named for figures associated with that god's myth.",
  },
  {
    q: "What makes a sci-fi planet name feel real vs. fantasy?",
    a: "Catalog-style structure — a plain root name plus a letter, number, or roman numeral (Traxis-7b, Kepleros IV) — reads as scientific because it mirrors how real exoplanets are actually labeled. A fully invented, flowing name with no designator (Xanaris, Vaelothis) reads as more mythic or space-opera, closer to how fantasy names a kingdom than how astronomy names a world.",
  },
  {
    q: "Can I name a moon or star with this tool too?",
    a: "Yes — nothing about the generator is planet-specific in the name itself. Use a base name (without a catalog letter) for a star, or take a generated name and treat it as the parent body, then invent a letter suffix for its moons the same way real exoplanet moons get named relative to their planet.",
  },
];

const soft = "text-[var(--color-ink-muted)]";

export default function PlanetNameGeneratorPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Planet Name Maker",
        description: DESCRIPTION,
        url: URL,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://handwrought.online/" },
          { "@type": "ListItem", position: 2, name: "Tools", item: "https://handwrought.online/tools/" },
          { "@type": "ListItem", position: 3, name: "Planet Name Maker", item: URL },
        ],
      },
    ],
  };

  return (
    <ToolChrome breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "Planet Name Maker" }]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <h1 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">Planet Name Maker</h1>
      <p className={`mt-2 max-w-xl font-sans text-sm leading-relaxed sm:text-[15px] ${soft}`}>
        Pick a planet type and genre, then generate 10 planet names instantly. Free, no signup.
      </p>

      <div className="mt-8">
        <PlanetGeneratorWidget />
      </div>

      <section className="mt-14 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">
          How planet naming works (real IAU conventions vs. fiction)
        </h2>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          Real planet naming is almost entirely administrative. A newly discovered exoplanet doesn’t get a proper
          name — it gets its host star’s catalog designation plus a letter (Kepler-186f, TRAPPIST-1e), assigned in
          discovery order. Actual names, when they exist at all, come later through a slow, formal process run by
          the International Astronomical Union. Fiction has no such constraint, which is both freeing and a trap:
          without any naming logic at all, a story’s planets end up sounding interchangeable.
        </p>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          The fix most working sci-fi uses is to borrow just enough of the real convention to feel grounded — a
          catalog-style suffix for planets your characters treat as newly surveyed, a fuller invented name for ones
          with an old, settled culture — without going all the way to real IAU nomenclature, which reads as dry on
          the page.
        </p>
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">Naming by planet type</h2>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          Type should inform feel as much as genre does. Volcanic and desert worlds read naturally harsher —
          sharper consonants, shorter names. Ocean and ice worlds lean softer or more mystical, since water and cold
          both carry a lot of existing poetic weight in language. Gas giants tend toward grander, more expansive-
          sounding names, since they’re the one planet type a story’s characters usually can’t stand on — they orbit
          it, live near it, or mine its moons, which changes how a culture would talk about it.
        </p>
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">Example planets</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EXAMPLE_PLANETS.map((p) => (
            <div key={p.name} className="rounded-md border border-[var(--color-border)] p-3">
              <p className="font-serif text-sm font-semibold text-[var(--color-ink)]">{p.name}</p>
              <p className={`mt-0.5 font-sans text-xs ${soft}`}>
                {p.genre} — {p.blurb}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-4">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">FAQ</h2>
        {FAQ.map((item) => (
          <div key={item.q}>
            <h3 className="font-sans text-sm font-semibold text-[var(--color-ink)]">{item.q}</h3>
            <p className={`mt-1 font-sans text-sm leading-relaxed ${soft}`}>{item.a}</p>
          </div>
        ))}
      </section>

      <p className={`mt-12 font-sans text-sm ${soft}`}>
        Back to the <Link href="/tools" className="text-[var(--color-accent)] underline">free tools hub</Link>.
        Naming a nation that lives on one of these worlds? Try the{" "}
        <Link href="/tools/nation-name-generator" className="text-[var(--color-accent)] underline">
          Nation Name Generator
        </Link>{" "}
        or the{" "}
        <Link href="/tools/city-name-generator" className="text-[var(--color-accent)] underline">
          City Name Generator
        </Link>
        .
      </p>
    </ToolChrome>
  );
}
