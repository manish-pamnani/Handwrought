import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blogPosts";

export const metadata: Metadata = {
  title: "Blog — HandWrought",
  description: "Notes on building HandWrought, writing with AI you can actually review, and the decisions behind it.",
};

export default function BlogIndexPage() {
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
            href="/"
            className="font-sans text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            Back home
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:py-16">
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)]">Blog</h1>
        <p className="mt-2 font-sans text-sm text-[var(--color-ink-muted)]">
          Notes on building HandWrought, writing with AI you can actually review, and the decisions behind it.
        </p>

        {BLOG_POSTS.length === 0 ? (
          <p className="mt-10 font-sans text-sm text-[var(--color-ink-muted)]">
            First post is on its way. In the meantime, see{" "}
            <Link href="/docs" className="text-[var(--color-accent)] underline">
              the docs
            </Link>{" "}
            for how HandWrought actually works.
          </p>
        ) : (
          <div className="mt-10 flex flex-col gap-6">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block rounded-lg border border-[var(--color-border)] p-5 transition-colors hover:border-[var(--color-accent-tint-border)]"
              >
                <p className="font-sans text-xs text-[var(--color-ink-muted)]">
                  {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
                <h2 className="mt-1 font-serif text-lg font-semibold text-[var(--color-ink)]">{post.title}</h2>
                <p className="mt-1 font-sans text-sm text-[var(--color-ink-muted)]">{post.description}</p>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--color-border)] px-5 py-6 text-center font-sans text-xs text-[var(--color-ink-muted)]">
        © {new Date().getFullYear()} HandWrought.
      </footer>
    </div>
  );
}
