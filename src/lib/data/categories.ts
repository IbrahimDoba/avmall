/**
 * Admin category data — richer than the storefront's `listCategories` (which
 * only counts published products and is `cache()`d for the shopfront). This
 * returns BOTH the total product count and the published count per category so
 * the admin Categories screen can show "12 products · 8 live".
 */

import "server-only";

import { db, hasDatabase } from "@/lib/db";
import { withRetry } from "@/lib/db";

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  position: number;
  /** Every product in the category (drafts + archived included). */
  totalProducts: number;
  /** Products live on the storefront (published, not archived). */
  publishedProducts: number;
}

/**
 * All categories with per-category product counts, ordered for display.
 * Categories are global (not store-scoped), so counts span every store — the
 * same basis the storefront `listCategories` uses.
 */
export async function listCategoriesAdmin(): Promise<AdminCategory[]> {
  if (!hasDatabase) return [];

  // Fetch categories + a thin projection of every product, then count in JS so
  // a product's SECONDARY categories count too (a product appears in its
  // primary category and any secondaryCategorySlugs). Cheap at this scale.
  const [cats, products] = await withRetry(() =>
    Promise.all([
      db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
      db.product.findMany({
        select: {
          categoryId: true,
          published: true,
          archivedAt: true,
          secondaryCategorySlugs: true,
        },
      }),
    ]),
  );

  return cats.map((c) => {
    let totalProducts = 0;
    let publishedProducts = 0;
    for (const p of products) {
      const inCategory = p.categoryId === c.id || p.secondaryCategorySlugs.includes(c.slug);
      if (!inCategory) continue;
      totalProducts += 1;
      if (p.published && p.archivedAt == null) publishedProducts += 1;
    }
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      position: c.position,
      totalProducts,
      publishedProducts,
    };
  });
}
