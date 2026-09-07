import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/handwrought-icon.svg" alt="" width={26} height={26} priority />
          <span className="font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            HandWrought
          </span>
        </Link>
        <Link
          href="/"
          className="font-sans text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          Back home
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:py-16">
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)]">{title}</h1>
        <div className="mt-8 flex flex-col gap-6 font-sans text-sm leading-relaxed text-[var(--color-ink)] [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-serif [&_h3]:text-base [&_h3]:font-semibold [&_p]:text-[var(--color-ink-muted)] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-[var(--color-ink-muted)] [&_li]:mt-1 [&_a]:text-[var(--color-accent)] [&_a]:underline">
          {children}
        </div>
      </main>

      <footer className="border-t border-[var(--color-border)] px-5 py-6 text-center font-sans text-xs text-[var(--color-ink-muted)]">
        © {new Date().getFullYear()} HandWrought.
      </footer>
    </div>
  );
}
