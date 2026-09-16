import type { Metadata } from "next";
import Link from "next/link";
import ToolChrome from "@/components/tools/ToolChrome";
import CityGeneratorWidget from "@/components/tools/CityGeneratorWidget";

const TITLE = "City Name Generator — Free City & Town Names | HandWrought";
const DESCRIPTION =
  "Generate city, town, and settlement names for your fantasy or sci-fi story — medieval, modern, or futuristic. Free, instant.";
const URL = "https://handwrought.online/tools/city-name-generator/";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const EXAMPLE_CITIES: { name: string; era: string; blurb: string }[] = [
  { name: "Wrenbury", era: "Medieval", blurb: "Market town, walls rebuilt three times, never once by choice." },
  { name: "Thornford", era: "Medieval", blurb: "River crossing city, tolls fund the whole garrison." },
  { name: "Aldernwick", era: "Medieval", blurb: "Foggy port, half its guildhalls empty since the plague year." },
  { name: "Greymoor", era: "Medieval", blurb: "Hill fortress town, permanently short on firewood, never short on soldiers." },
  { name: "Norwicgate", era: "Medieval", blurb: "Border town, changes hands every generation, keeps rebuilding the same gate." },
  { name: "Starkeep", era: "Medieval", blurb: "Fortress-monastery — the only city in the range no army has ever taken." },
  { name: "Bayville", era: "Modern", blurb: "Coastal college town, grew up around a shipyard that's long gone." },
  { name: "Ironburg", era: "Modern", blurb: "Steel town turned logistics hub, half the skyline still smokestacks." },
  { name: "Fairview", era: "Modern", blurb: "Suburb-turned-city, incorporated the moment the highway went in." },
  { name: "Cedarport", era: "Modern", blurb: "Fishing town rebranded as a tourist harbor; locals still use the old name." },
  { name: "Harborcrest", era: "Modern", blurb: "Old whaling port, now an offshore wind hub." },
  { name: "Neopolis", era: "Futuristic", blurb: "Vertical megacity — ground level hasn't seen sunlight in two generations." },
  { name: "Vexgrid", era: "Futuristic", blurb: "Company town for an orbital elevator; no permanent residents allowed." },
  { name: "Zenspire", era: "Futuristic", blurb: "Built inside a decommissioned space station's hull." },
  { name: "Novahaven", era: "Futuristic", blurb: "Refugee city, built in six months, still technically 'temporary.'" },
  { name: "Arcnode", era: "Futuristic", blurb: "Data-center city — population mostly maintenance crews and their families." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What are common city-naming patterns (prefixes/suffixes)?",
    a: "Most real-world city names encode geography or function in their suffix: -ford and -bridge mark a river crossing, -bury/-burg mark a fortified settlement, -port/-haven mark a harbor, -ton/-ville mark a smaller founded settlement. Fictional cities borrow this same trick — a suffix that implies why the city is where it is (a crossing, a harbor, a mine) reads as more grounded than an equally pretty name with no functional logic behind it.",
  },
  {
    q: "How do I keep city names consistent within one kingdom/region?",
    a: "Pick a small set of suffixes and onsets for that region and reuse them across every settlement in it, the same way real regions share naming DNA (England's -chester towns, Germany's -burg towns). This tool's region/geography hint field is built for that — feed it the same word across several generations and the results will echo it, so a kingdom's capital and its outlying towns end up sounding like they belong to the same map.",
  },
  {
    q: "What's the difference between a city name and a nickname?",
    a: "The name is what's on the map and in official use; a nickname is what people actually call it in conversation, and it usually references something the formal name doesn't — a landmark, an industry, a joke that stuck. \"Ironburg\" might get called \"the Foundry\" by everyone who lives there. Giving a city both is a fast way to make it feel lived-in rather than freshly invented.",
  },
];

const soft = "text-[var(--color-ink-muted)]";

export default function CityNameGeneratorPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "City Name Generator",
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
          { "@type": "ListItem", position: 3, name: "City Name Generator", item: URL },
        ],
      },
    ],
  };

  return (
    <ToolChrome breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "City Name Generator" }]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <h1 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">City Name Generator</h1>
      <p className={`mt-2 max-w-xl font-sans text-sm leading-relaxed sm:text-[15px] ${soft}`}>
        Pick an era and atmosphere, then generate 10 city names instantly. Free, no signup.
      </p>

      <div className="mt-8">
        <CityGeneratorWidget />
      </div>

      <section className="mt-14 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">How city naming works</h2>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          Real cities are named after why they exist — a crossing, a harbor, a mine, a market — and that logic
          survives for centuries after the original reason stops mattering. Fictional cities that skip this step
          end up sounding pretty but arbitrary. The fastest fix is to decide, even briefly, why your city is where
          it is before naming it: that answer usually points straight at a suffix (-ford for a crossing, -port for a
          harbor, -burg for a fortified town) that makes the name feel earned rather than decorative.
        </p>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          Atmosphere matters too, separately from geography — the same crossing-town suffix can carry a welcoming
          feel or an eerie one depending on the syllables around it, which is why this generator treats era and
          atmosphere as two independent dials rather than folding them into one “style” choice.
        </p>
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">Naming by era and atmosphere</h2>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          Medieval-era names lean on old, functional English/Germanic suffixes (-bury, -wick, -ford, -moor) that
          signal an ancient, organically-grown settlement. Modern names are flatter and more compound (-ville, -town,
          -burg, -view), reading as founded-on-purpose rather than accumulated over centuries. Futuristic names trade
          the geography-based suffixes for infrastructure-based ones (-grid, -spire, -sector, -node) — the city is
          named after what it plugs into, not what land feature it sits on.
        </p>
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">Example cities</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EXAMPLE_CITIES.map((c) => (
            <div key={c.name} className="rounded-md border border-[var(--color-border)] p-3">
              <p className="font-serif text-sm font-semibold text-[var(--color-ink)]">{c.name}</p>
              <p className={`mt-0.5 font-sans text-xs ${soft}`}>
                {c.era} — {c.blurb}
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
        Back to the <Link href="/tools" className="text-[var(--color-accent)] underline">free tools hub</Link>. Need
        the country this city belongs to? Try the{" "}
        <Link href="/tools/nation-name-generator" className="text-[var(--color-accent)] underline">
          Nation Name Generator
        </Link>{" "}
        — or a sci-fi setting, the{" "}
        <Link href="/tools/planet-name-generator" className="text-[var(--color-accent)] underline">
          Planet Name Maker
        </Link>
        .
      </p>
    </ToolChrome>
  );
}
