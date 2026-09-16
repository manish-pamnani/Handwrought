import type { Metadata } from "next";
import Link from "next/link";
import ToolChrome from "@/components/tools/ToolChrome";

const TITLE = "Free Worldbuilding Tools — Name Generators | HandWrought";
const DESCRIPTION = "Free name generators for fiction writers and worldbuilders — instant results, no signup.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://handwrought.online/tools/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://handwrought.online/tools/", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const LIVE_TOOLS = [
  {
    href: "/tools/nation-name-generator",
    name: "Nation & Country Name Generator",
    description: "Fantasy, sci-fi, historical, modern, or tribal nation and country names.",
  },
  {
    href: "/tools/villain-name-generator",
    name: "Villain Name Generator",
    description: "Dark fantasy, sci-fi, horror, or crime antagonist names.",
  },
  {
    href: "/tools/planet-name-generator",
    name: "Planet Name Maker",
    description: "Gas giant to volcanic, hard sci-fi to space opera.",
  },
  {
    href: "/tools/city-name-generator",
    name: "City Name Generator",
    description: "Medieval, modern, or futuristic city and town names.",
  },
];

export default function ToolsHubPage() {
  return (
    <ToolChrome breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools" }]}>
      <h1 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
        Free worldbuilding tools
      </h1>
      <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-[15px]">
        Instant name generators for fiction writers. Free, no signup.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {LIVE_TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="block rounded-lg border border-[var(--color-border)] p-5 transition-colors hover:border-[var(--color-accent-tint-border)]"
          >
            <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">{tool.name}</h2>
            <p className="mt-1 font-sans text-sm text-[var(--color-ink-muted)]">{tool.description}</p>
          </Link>
        ))}
      </div>
    </ToolChrome>
  );
}
