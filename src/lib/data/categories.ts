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

  const [cats, published] = await withRetry(() =>
    Promise.all([
      db.category.findMany({
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: { _count: { select: { products: true } } },
      }),
      db.product.groupBy({
        by: ["categoryId"],
        where: { archivedAt: null, published: true },
        _count: { _all: true },
      }),
    ]),
  );

  const publishedByCategory = new Map(
    published.map((p) => [p.categoryId, p._count._all]),
  );

  return cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    position: c.position,
    totalProducts: c._count.products,
    publishedProducts: publishedByCategory.get(c.id) ?? 0,
  }));
}
