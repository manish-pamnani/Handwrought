import type { Metadata } from "next";
import Link from "next/link";
import ToolChrome from "@/components/tools/ToolChrome";
import VillainGeneratorWidget from "@/components/tools/VillainGeneratorWidget";

const TITLE = "Villain Name Generator — Free Antagonist Names | HandWrought";
const DESCRIPTION =
  "Generate menacing villain and antagonist names for dark fantasy, sci-fi, horror, or crime stories. Free, instant, no signup.";
const URL = "https://handwrought.online/tools/villain-name-generator/";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const EXAMPLE_VILLAINS: { name: string; genre: string; blurb: string }[] = [
  { name: "Lord Malvexthorn", genre: "Dark Fantasy", blurb: "A usurped king who traded his throne for something older and hungrier." },
  { name: "Lady Isolde Duskveil", genre: "Dark Fantasy", blurb: "Runs the shadow court every kingdom pretends doesn't exist." },
  { name: "The Nameless Wraithgloom", genre: "Dark Fantasy", blurb: "No one who's spoken its name has lived to regret it twice." },
  { name: "Vexthorn", genre: "Dark Fantasy", blurb: "A blade-for-hire who collects the titles of the lords he kills." },
  { name: "Commander Drakonix", genre: "Sci-Fi", blurb: "Runs a fleet that answers to no charter but its own." },
  { name: "Overseer Zexdrex", genre: "Sci-Fi", blurb: "Built the colony's laws, then rewrote them to need him." },
  { name: "Nyra Novacore", genre: "Sci-Fi", blurb: "Sold the terraforming codes to whoever paid, then kept both payments." },
  { name: "Cyrus Vantron", genre: "Sci-Fi", blurb: "A corporate exec who never lost a hostile takeover — or a war." },
  { name: "Doctor Ambrose Hollowmaw", genre: "Horror", blurb: "His patients don't leave the ward. They just stop asking to." },
  { name: "The Widow Gauntwick", genre: "Horror", blurb: "Every house on the street has a room she's not allowed in — yet." },
  { name: "Reverend Cain Shroudrend", genre: "Horror", blurb: "Preaches a gospel no one remembers agreeing to follow." },
  { name: "Evangeline Mournhollow", genre: "Horror", blurb: "Sings the town to sleep. No one's woken up since." },
  { name: "Vinnie \"Razor\" Caruso", genre: "Crime", blurb: "Runs the docks. Owns the harbor master. Owns you too, eventually." },
  { name: "Don Marco Sorrento", genre: "Crime", blurb: "Never raises his voice. Never has to." },
  { name: "Roxy \"Ghost\" Vega", genre: "Crime", blurb: "The one heist nobody can prove she was even in the building for." },
  { name: "Nico \"Wolf\" Kessler", genre: "Crime", blurb: "Collects debts personally. Prefers it that way." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What makes a villain name memorable?",
    a: "Contrast and specificity. A name that's too on-the-nose (Lord Evilbane) reads as a joke; a name that's forgettable blends into the cast list. The names that stick usually pair something ordinary with something sharp — a real-sounding given name next to an invented or menacing surname, or a mundane title (Doctor, Director) attached to something that shouldn't have one.",
  },
  {
    q: "Should a villain's name hint at their personality?",
    a: "A little, not entirely. A name that spells out the villain's whole deal (Malice Cruelheart) does the reader's work for them and drains the reveal. Better to let the name suggest a mood or origin — dread, control, decay — and let the character's actions do the actual characterizing.",
  },
  {
    q: "How do I avoid clichéd villain names?",
    a: "Skip the obvious vocabulary — Dark, Death, Shadow, Doom used as literal name components are the first thing most writers reach for, so they're also the fastest way to read as generic. Invented syllables (Vexthorn, Malvexthorn) or a real, ordinary name paired with an unsettling detail (a title, an epithet, a reputation) usually land harder than a name built entirely from villain-vocabulary.",
  },
];

const soft = "text-[var(--color-ink-muted)]";

export default function VillainNameGeneratorPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Villain Name Generator",
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
          { "@type": "ListItem", position: 3, name: "Villain Name Generator", item: URL },
        ],
      },
    ],
  };

  return (
    <ToolChrome breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "Villain Name Generator" }]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <h1 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">Villain Name Generator</h1>
      <p className={`mt-2 max-w-xl font-sans text-sm leading-relaxed sm:text-[15px] ${soft}`}>
        Pick a genre, gender preference, and optional theme, then generate 10 villain names instantly. Free, no
        signup.
      </p>

      <div className="mt-8">
        <VillainGeneratorWidget />
      </div>

      <section className="mt-14 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">What makes a villain name work</h2>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          A villain name has one job the hero’s name doesn’t: it has to work before the reader knows anything about
          the character. A protagonist’s name can be plain because the story earns its weight over time — a villain
          often only gets a page or two of introduction before they need to feel like a threat. That means the name
          itself has to do some of that work: harder consonants, a title or honorific that implies power already
          claimed, or a structure (given name + surname + epithet) that reads as someone with a reputation attached.
        </p>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          The trap is overcorrecting into cliché — stacking every ominous syllable you can think of until the name
          reads as parody instead of menace. The names that actually land tend to be restrained: one sharp detail,
          not five.
        </p>
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">Naming by genre</h2>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          Dark fantasy and horror villains lean on invented, older-sounding names — syllables that feel like they
          predate the story, with titles (Lord, Lady, The Widow) that imply an old, settled kind of power. Sci-fi
          villains usually read as newer and more constructed: sharper, more mechanical-sounding names, with
          corporate or military titles (Commander, Director, Overseer) standing in for the old aristocratic ones.
        </p>
        <p className={`font-sans text-sm leading-relaxed ${soft}`}>
          Crime villains break the pattern entirely — they need to sound like real people, not invented ones, so the
          menace comes from a nickname in quotes (“Razor,” “Ghost,” “Wolf”) rather than an invented surname. A crime
          boss named Kryovexthorn breaks the genre’s whole illusion of realism.
        </p>
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">Example villains</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EXAMPLE_VILLAINS.map((v) => (
            <div key={v.name} className="rounded-md border border-[var(--color-border)] p-3">
              <p className="font-serif text-sm font-semibold text-[var(--color-ink)]">{v.name}</p>
              <p className={`mt-0.5 font-sans text-xs ${soft}`}>
                {v.genre} — {v.blurb}
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
        Back to the <Link href="/tools" className="text-[var(--color-accent)] underline">free tools hub</Link>. Your
        villain needs somewhere to rule from — try the{" "}
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
