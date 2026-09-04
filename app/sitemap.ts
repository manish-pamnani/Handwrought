import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blogPosts";

const BASE_URL = "https://handwrought.online";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/pricing", "/checkout", "/contact", "/docs", "/blog", "/privacy", "/refund", "/terms"];
  const staticEntries = routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
  }));
  // New posts appear here automatically — no edits needed beyond adding
  // them to lib/blogPosts.ts.
  const postEntries = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));
  return [...staticEntries, ...postEntries];
}
