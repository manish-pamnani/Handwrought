import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "@/components/LegalPage";
import { BLOG_POSTS, getBlogPost } from "@/lib/blogPosts";

const AUTHOR_NAME = "Manish Pamnani";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — HandWrought`,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: "article", publishedTime: post.date, modifiedTime: post.updated, authors: [AUTHOR_NAME] },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const url = `https://handwrought.online/blog/${post.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: "https://handwrought.online/opengraph-image",
    author: { "@type": "Person", name: AUTHOR_NAME },
    publisher: {
      "@type": "Organization",
      name: "HandWrought",
      logo: { "@type": "ImageObject", url: "https://handwrought.online/handwrought-logo-lockup.svg" },
    },
  };

  return (
    <LegalPage title={post.title}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <p className="text-xs text-[var(--color-ink-muted)]">
        By {AUTHOR_NAME} · Published <time dateTime={post.date}>{formatDate(post.date)}</time>
        {post.updated !== post.date && (
          <>
            {" "}
            · Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time>
          </>
        )}
      </p>
      {post.content}
    </LegalPage>
  );
}
