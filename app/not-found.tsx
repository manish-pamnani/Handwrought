import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/handwrought-icon.svg" alt="" width={26} height={26} priority />
          <span className="font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            HandWrought
          </span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <p className="font-serif text-5xl font-semibold text-[var(--color-ink)]">404</p>
        <h1 className="mt-3 font-serif text-xl font-semibold text-[var(--color-ink)]">Page not found</h1>
        <p className="mt-1.5 font-sans text-[13.5px] text-[var(--color-ink-muted)]">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Back home
        </Link>
      </main>
    </div>
  );
}
