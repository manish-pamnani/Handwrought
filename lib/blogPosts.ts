// Single source of truth for blog content — the index page and the
// individual post route both read from this array, and the sitemap maps
// over it too, so adding a real post later is just adding an entry here,
// no route/plumbing changes needed.
export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date, e.g. "2026-09-10"
  content: string[]; // paragraphs, rendered as <p> in order — kept plain
  // (no markdown pipeline exists in this codebase yet) since posts are
  // hand-authored one at a time, not imported from elsewhere.
};

export const BLOG_POSTS: BlogPost[] = [];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
