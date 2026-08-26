import type { MetadataRoute } from "next";

const BASE_URL = "https://handwrought.online";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/pricing", "/checkout", "/contact", "/privacy", "/refund", "/terms"];
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
  }));
}
