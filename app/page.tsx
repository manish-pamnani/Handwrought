"use client";

import Image from "next/image";
import Link from "next/link";
import { LANGUAGES, TONES } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";

const FEATURES = [
  {
    title: "Inline suggestions",
    description:
      "Ask for a rewrite, an expansion, or a new paragraph. Suggestions land right where your cursor is, with multiple options to choose from.",
  },
  {
    title: "Your own API key",
    description:
      "HandWrought runs on your Gemini API key. Your drafts and prompts go straight from your browser to Google — never stored on our servers.",
  },
  {
    title: "Tone & language control",
    description: `Generate in ${LANGUAGES.length} languages and ${TONES.length} tones — from Formal to Casual — without leaving the page.`,
  },
  {
    title: "Real formatting toolbar",
    description: "Headings, lists, tables, highlights, and images — a proper document, not a plain textbox.",
  },
];

const STEPS = [
  { title: "Add your API key", description: "Bring your own free Gemini API key in Settings. Takes under a minute." },
  { title: "Write", description: "Draft in a distraction-free editor built for long-form writing." },
  { title: "Ask for a hand", description: "Select text or place your cursor, describe what you need, and review AI suggestions inline." },
  { title: "Accept & export", description: "Keep what works, discard what doesn't, and export your draft as Markdown." },
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Image src="/handwrought-icon.svg" alt="" width={28} height={28} priority />
          <span className="font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            HandWrought
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!loading && user ? (
            <Link
              href="/app"
              className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Go to HandWrought
            </Link>
          ) : (
            <>
              <Link
                href="/app"
                className="rounded-md px-3 py-1.5 font-sans text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
              >
                Sign in
              </Link>
              <Link
                href="/checkout"
                className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center px-5 py-20 text-center sm:py-28">
          <p className="mb-4 font-mono text-xs tracking-[0.15em] text-[var(--color-accent)]">
            WRITTEN BY HAND · SHAPED BY AI
          </p>
          <h1 className="font-serif text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
            An AI writing companion that stays out of your way.
          </h1>
          <p className="mt-5 max-w-xl font-sans text-base text-[var(--color-ink-muted)] sm:text-lg">
            Draft, edit, and polish long-form writing with inline AI suggestions — powered by your own API key, so
            your words stay yours.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/checkout"
              className="w-full rounded-full bg-[var(--color-accent)] px-6 py-3 text-center font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] sm:w-auto"
            >
              Get HandWrought — one-time payment
            </Link>
            <a
              href="#pricing"
              className="w-full rounded-full border border-[var(--color-border)] px-6 py-3 text-center font-sans text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)] sm:w-auto"
            >
              See pricing
            </a>
          </div>
        </section>

        <section className="border-t border-[var(--color-border)] bg-[var(--color-paper-inset)] px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
              Everything you need to write, nothing you don&apos;t
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
                  <h3 className="font-sans text-sm font-semibold text-[var(--color-ink)]">{f.title}</h3>
                  <p className="mt-2 font-sans text-sm text-[var(--color-ink-muted)]">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
              How it works
            </h2>
            <ol className="mt-10 flex flex-col gap-6">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] font-mono text-xs font-semibold text-[var(--color-accent)]">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-sans text-sm font-semibold text-[var(--color-ink)]">{step.title}</h3>
                    <p className="mt-1 font-sans text-sm text-[var(--color-ink-muted)]">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-8 border-t border-[var(--color-border)] px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-md">
            <h2 className="text-center font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
              Simple, one-time pricing
            </h2>
            <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-inset)] p-6">
              <p className="font-sans text-sm font-medium text-[var(--color-ink-muted)]">Lifetime access</p>
              <p className="mt-1 font-serif text-4xl font-semibold text-[var(--color-ink)]">
                $9.99 <span className="font-sans text-base font-normal text-[var(--color-ink-muted)]">one-time</span>
              </p>
              <ul className="mt-5 flex flex-col gap-2 font-sans text-sm text-[var(--color-ink)]">
                <li>All languages and tones</li>
                <li>Full formatting toolbar & Markdown export</li>
                <li>Free updates, forever</li>
              </ul>
              <Link
                href="/checkout"
                className="mt-6 block w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-center font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                Buy now
              </Link>
              <p className="mt-3 text-center font-sans text-xs text-[var(--color-ink-muted)]">
                Requires your own free Gemini API key.
              </p>
              <p className="mt-2 text-center font-sans text-xs text-[var(--color-ink-muted)]">
                First 150 buyers:{" "}
                <Link href="/checkout?promo=EARLYBIRD50" className="text-[var(--color-accent)] underline">
                  get it for $4.99
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] px-5 py-6 text-center font-sans text-xs text-[var(--color-ink-muted)]">
        © {new Date().getFullYear()} HandWrought.
      </footer>
    </div>
  );
}
