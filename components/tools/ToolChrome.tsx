import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Shared header/footer shell for handwrought.online/tools/* pages — same visual language as the blog/legal pages, plus a "Tools" nav link for internal linking signal and a breadcrumb slot for BreadcrumbList schema. */
export default function ToolChrome({
  breadcrumb,
  children,
}: {
  breadcrumb?: { label: string; href?: string }[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/handwrought-icon.svg" alt="" width={26} height={26} priority />
          <span className="font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            HandWrought
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link
            href="/tools"
            className="font-sans text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            Tools
          </Link>
          <Link
            href="/blog"
            className="font-sans text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            Blog
          </Link>
          <Link
            href="/"
            className="font-sans text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            Back home
          </Link>
        </nav>
      </header>

      {breadcrumb && breadcrumb.length > 0 && (
        <div className="mx-auto w-full max-w-3xl px-5 pt-4 sm:px-8">
          <ol className="flex flex-wrap items-center gap-1 font-sans text-xs text-[var(--color-ink-muted)]">
            {breadcrumb.map((crumb, i) => (
              <li key={crumb.label} className="flex items-center gap-1">
                {i > 0 && <span className="text-[var(--color-border)]">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[var(--color-ink)]">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8 sm:py-14">{children}</main>

      <footer className="border-t border-[var(--color-border)] px-5 py-6 text-center font-sans text-xs text-[var(--color-ink-muted)]">
        © {new Date().getFullYear()} HandWrought.
      </footer>
    </div>
  );
}
