import type { Metadata } from "next";
import Link from "next/link";
import ToolChrome from "@/components/tools/ToolChrome";
import NationGeneratorWidget from "@/components/tools/NationGeneratorWidget";

const TITLE = "Nation Name Generator — Free Country & Kingdom Names | HandWrought";
const DESCRIPTION =
  "Generate fantasy, sci-fi, historical, modern, or tribal nation and country names for your novel or worldbuilding project — instant, free, no signup.";
const URL = "https://handwrought.online/tools/nation-name-generator/";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const EXAMPLE_NATIONS: { name: string; genre: string; blurb: string }[] = [
  { name: "Kingdom of Thornmere", genre: "Fantasy", blurb: "A forest realm ruled by a line of hedge-witch queens." },
  { name: "Valdorwyn", genre: "Fantasy", blurb: "Cliffside city-state famous for its glass bridges." },
  { name: "Selthasgard", genre: "Fantasy", blurb: "A militant highland empire, never once successfully invaded." },
  { name: "Ael'ynn Republic", genre: "Fantasy", blurb: "Governed by a council of retired dragon-riders." },
  { name: "Nexara Prime", genre: "Sci-Fi", blurb: "Orbital habitat federation, three generations removed from Earth." },
  { name: "Kyllion", genre: "Sci-Fi", blurb: "Terraformed mining colony, now independent of its founding corporation." },
  { name: "Uxforge Dominion", genre: "Sci-Fi", blurb: "Industrial world where every citizen is a shareholder." },
  { name: "Solaris Ix", genre: "Sci-Fi", blurb: "Twin-star system nation, permanently at odds over which sun is 'home'." },
  { name: "Estavia", genre: "Historical", blurb: "River-trade kingdom, wealthy from tolls, weak in open battle." },
  { name: "Kingdom of Novgrad", genre: "Historical", blurb: "Fortress capital, built after three prior capitals burned." },
  { name: "Brathia", genre: "Historical", blurb: "A confederation of five ports, none of which fully trust the other four." },
  { name: "Ostmark Republic", genre: "Historical", blurb: "Broke from empire two generations ago; still fighting about the debt." },
  { name: "Ashfield Commonwealth", genre: "Modern", blurb: "Farming nation turned tech exporter within a single generation." },
  { name: "Ironpoint Federation", genre: "Modern", blurb: "Union of former mining towns, now run on renewable co-ops." },
  { name: "Fairhaven", genre: "Modern", blurb: "Coastal republic best known for its neutral banking laws." },
  { name: "Cedarreach", genre: "Modern", blurb: "Border nation shaped by a century of shifting treaties." },
  { name: "Zulnga", genre: "Tribal", blurb: "Desert confederation, its clans united only during the dry season." },
  { name: "Karawai", genre: "Tribal", blurb: "Island nation governed by a rotating council of elder navigators." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What makes a good fictional nation name?",
    a: "It should be pronounceable at a glance, distinct from your other place names so readers don't confuse it with a neighbor, and it should hint at something — a sound, a history, a landscape — without you having to explain it in the text. If a reader can say it in their head on the first try, it's doing its job.",
  },
  {
    q: "Should a nation's name match its neighbors' language?",
    a: "Usually yes, if they share a history — real-world naming clusters regionally because language spreads through trade, conquest, and migration. A sharp break in naming style (a harsh, consonant-heavy neighbor next to a soft, vowel-heavy one) reads as intentional only if you explain why: a mountain range, a different founding people, a conquest that never quite finished. Otherwise it just reads as inconsistent.",
  },
  {
    q: "Can I use these names commercially?",
    a: "Yes. Names generated here are yours to use in any project, published or commercial, with no attribution required. They're algorithmically generated word combinations, not copyrighted text.",
  },
  {
    q: "What's the difference between a nation and a country name?",
    a: "In practice, none — \"country\" and \"nation\" are used interchangeably for a sovereign territory. The distinction that matters more for naming is between the state and the people: \"nation\" can also refer to a shared cultural or ethnic identity that doesn't map to a single country (a nation without a state, or a country containing several nations), which is worth knowing if your story's politics hinge on that gap.",
  },
];

const soft = "text-[var(--color-ink-muted)]";

export default function NationNameGeneratorPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Nation & Country Name Generator",
        description: DESCRIPTION,
        url: URL,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://handwrought.online/" },
          { "@type": "ListItem", position: 2, name: "Tools", item: "https://handwrought.online/tools/" },
          { "@type": "ListItem", position: 3, name: "Nation & Country Name Generator", item: URL },
        ],
      },
    ],
  };

  return (
    <ToolChrome breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "Nation & Country Name Generator" }]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <h1 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
        Nation & Country Name Generator
      </h1>
      <p className={`mt-2 max-w-xl font-sans text-sm leading-relaxed sm:text-[15px] ${soft}`}>
        Pick a genre, tone, and government type, then generate 10 nation names instantly. Free, no signup.
      </p>

      <div className="mt-8">
        <NationGeneratorWidget />
      </div>

      <section className="mt-14 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">How nation naming works</h2>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          A nation name is doing two jobs at once: it has to sound like a place, and it has to sound like it belongs
          to the rest of your world. The first job is mostly phonetics — consistent syllable patterns, a manageable
          number of consonant clusters, an ending that reads as a place-name suffix (-ia, -land, -stan, -gard) rather
          than a person’s name. The second job is harder, and it’s where most generated names fall apart: a name
          that’s individually fine but doesn’t sound like it comes from the same language family as the kingdom next
          door.
        </p>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          The fix is to decide, even loosely, where a name comes from before you pick it — a root language, a
          founding culture, a geographic feature it’s named after — and then let that logic touch every name you
          invent for that region. This tool’s seed-word field is built for exactly that: give it a word from your
          existing world (a founder’s name, an older place name, a word in your invented language) and the generator
          weaves it into a portion of the results, so the names it hands back already share DNA with what you’ve
          built.
        </p>
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">
          Fantasy vs. sci-fi vs. historical naming
        </h2>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          Fantasy nation names lean on mythic weight — soft, old-sounding endings (-wyn, -mere, -ael) for peaceful or
          mystical realms, harder consonant clusters (-gard, -dor, -thas) for anything martial. Sci-fi names trade
          that mythic feel for something more constructed: sharper, more geometric-sounding syllables (Nexara, Kyllion,
          Uxforge) that read as engineered or corporate rather than ancient, since most fictional space nations are
          only a few generations old.
        </p>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          Historical-style names (real-world-adjacent but still fictional) borrow the naming logic of actual empires
          and kingdoms — river names, founder names, and suffixes like -ia, -berg, and -grad that signal a specific
          real-world naming tradition without copying an actual country. Modern and tribal names each have their own
          patterns too: modern nations tend toward plain, compound English place-names (Ashfield, Ironpoint), while
          tribal and clan-based nations often keep names short, vowel-forward, and tied to a specific landscape or
          founding act rather than a dynasty.
        </p>
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">Example nations</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EXAMPLE_NATIONS.map((n) => (
            <div key={n.name} className="rounded-md border border-[var(--color-border)] p-3">
              <p className="font-serif text-sm font-semibold text-[var(--color-ink)]">{n.name}</p>
              <p className={`mt-0.5 font-sans text-xs ${soft}`}>
                {n.genre} — {n.blurb}
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
        Naming the capital?{" "}
        <Link href="/tools/city-name-generator" className="text-[var(--color-accent)] underline">
          Try the City Name Generator
        </Link>{" "}
        — or give this nation a{" "}
        <Link href="/tools/villain-name-generator" className="text-[var(--color-accent)] underline">
          Villain Name Generator
        </Link>{" "}
        antagonist.
      </p>
    </ToolChrome>
  );
}
