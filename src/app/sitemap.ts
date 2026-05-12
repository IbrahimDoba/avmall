import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { listAllProductSlugs, listCategories } from "@/lib/data/products";

export const revalidate = 3600; // regenerate hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE.url}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/makers`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/journal`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE.url}/careers`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE.url}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE.url}/shipping`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/returns`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/faq`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE.url}/track-order`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE.url}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE.url}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE.url}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Categories + products are dynamic. Best-effort — if the DB is unreachable
  // we still ship the static list.
  let categories: { id: string }[] = [];
  let productSlugs: string[] = [];
  try {
    [categories, productSlugs] = await Promise.all([
      listCategories(),
      listAllProductSlugs(),
    ]);
  } catch {
    // DB unreachable — skip dynamic entries this round.
  }

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE.url}/category/${c.id}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const productPages: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${SITE.url}/product/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
