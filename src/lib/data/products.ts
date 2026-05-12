/**
 * Product data layer. Reads from the DB when DATABASE_URL is set, otherwise
 * falls back to the in-memory mock data so the storefront keeps working
 * during design iterations.
 *
 * All callers consume the same `Product` view type from mock-data.ts — DB
 * shapes are converted via `productFromDb()`.
 */

import "server-only";

import { cache } from "react";
import { db, hasDatabase, withRetry } from "@/lib/db";
import {
  PRODUCTS as MOCK_PRODUCTS,
  CATEGORIES as MOCK_CATEGORIES,
  type Product,
  type ProductCategoryId,
  type Category,
} from "@/lib/mock-data";

// Prisma row types — kept at the data-layer boundary; never leak outward.
import type {
  Product as DbProduct,
  ProductVariant as DbVariant,
  BulkTier as DbBulkTier,
  Category as DbCategoryRow,
} from "@prisma/client";

type DbProductWith = DbProduct & {
  variants: DbVariant[];
  bulkTiers: DbBulkTier[];
  category: DbCategoryRow;
};

/** Convert a Prisma product (with relations) into the view-shape used by pages. */
function productFromDb(p: DbProductWith): Product {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    short: p.shortDesc,
    mark: p.brand[0]?.toUpperCase() ?? "A",
    category: "home", // overwritten by withCategorySlug() below
    imageUrl: defaultImageFor(p.slug),
    bg: p.themeBg ?? "linear-gradient(135deg, #ece4d4 0%, #c4a87a 100%)",
    price: Number(p.priceKobo),
    ...(p.saleKobo != null && { sale: Number(p.saleKobo) }),
    saleActive: p.saleActive,
    stock: p.variants.reduce((a, v) => a + v.onHand, 0),
    rating: 4.7,
    reviews: 0,
    bulk: p.bulkTiers.map((t) => ({
      min: t.min,
      max: t.max,
      type: t.type,
      value: t.value,
    })),
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      stock: v.onHand,
      price: v.priceKobo == null ? null : Number(v.priceKobo),
    })),
    negotiate: p.negotiate,
    preorder: p.preorder,
    ...(p.moq != null && { moq: p.moq }),
    ...(p.eta && { eta: p.eta }),
  } as Product;
}


/**
 * Reuse the Unsplash URL stored in mock-data for the same slug. Phase 5 will
 * read R2 image keys off ProductImage rows; for now we lean on the demo set
 * with a deterministic picsum.photos fallback for products created via
 * /admin/products/new (which won't match any mock slug).
 */
function defaultImageFor(slug: string): string {
  const m = MOCK_PRODUCTS.find((p) => p.slug === slug);
  if (m) return m.imageUrl;
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}/800/800`;
}

function gallerySlugLookup(slug: string): string[] | undefined {
  const m = MOCK_PRODUCTS.find((p) => p.slug === slug);
  return m?.gallery;
}

/**
 * Hoist the category slug onto the product so the storefront's existing
 * `product.category` access keeps working. Prisma gives us a relation, not a
 * scalar slug — we look it up via the include + categoryById map.
 */
/** Sets the category slug + mock gallery on the converted product. Category
 *  is now loaded via Prisma `include`, so no follow-up query needed. */
function finalize(p: DbProductWith): Product {
  const view = productFromDb(p);
  view.category = p.category.slug as ProductCategoryId;
  const gallery = gallerySlugLookup(view.slug);
  if (gallery) view.gallery = gallery;
  return view;
}

// ─── Categories ───────────────────────────────────────────────────────────

/**
 * Categories — one query (with product `_count`) instead of two. Wrapped in
 * React `cache` so two callers in the same request share the result.
 */
export const listCategories = cache(async (): Promise<Category[]> => {
  if (!hasDatabase) return [...MOCK_CATEGORIES];

  const cats = await withRetry(() =>
    db.category.findMany({
      orderBy: { position: "asc" },
      include: {
        _count: {
          select: { products: { where: { archivedAt: null, published: true } } },
        },
      },
    }),
  );
  return cats.map((c) => ({
    id: c.slug as ProductCategoryId,
    name: c.name,
    count: c._count.products,
  }));
});

export const getCategoryBySlug = cache(
  async (slug: string): Promise<Category | null> => {
    if (!hasDatabase) {
      return MOCK_CATEGORIES.find((c) => c.id === slug) ?? null;
    }
    const cat = await withRetry(() =>
      db.category.findUnique({
        where: { slug },
        include: {
          _count: {
            select: { products: { where: { archivedAt: null, published: true } } },
          },
        },
      }),
    );
    if (!cat) return null;
    return {
      id: cat.slug as ProductCategoryId,
      name: cat.name,
      count: cat._count.products,
    };
  },
);

// ─── Products ─────────────────────────────────────────────────────────────

export async function listProducts(opts?: {
  category?: string;
  limit?: number;
  featuredFirst?: boolean;
  /** Admin view — return unpublished and archived products too. */
  includeUnpublished?: boolean;
}): Promise<Product[]> {
  if (!hasDatabase) {
    let list = [...MOCK_PRODUCTS];
    if (opts?.category) list = list.filter((p) => p.category === opts.category);
    if (opts?.limit != null) list = list.slice(0, opts.limit);
    return list;
  }

  const where = {
    ...(!opts?.includeUnpublished && { archivedAt: null, published: true }),
    ...(opts?.category && { category: { slug: opts.category } }),
  };
  // Single query — joins variants, bulkTiers, AND category in one round trip.
  const products = await withRetry(() =>
    db.product.findMany({
      where,
      include: {
        variants: { orderBy: { position: "asc" } },
        bulkTiers: true,
        category: true,
      },
      orderBy: opts?.featuredFirst
        ? [{ featured: "desc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }],
      ...(opts?.limit != null && { take: opts.limit }),
    }),
  );

  return products.map((p) => finalize(p as DbProductWith));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!hasDatabase) {
    return MOCK_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }
  const p = await withRetry(() =>
    db.product.findUnique({
      where: { slug },
      include: {
        variants: { orderBy: { position: "asc" } },
        bulkTiers: true,
        category: true,
      },
    }),
  );
  if (!p || p.archivedAt) return null;
  return finalize(p as DbProductWith);
}

export async function getRelatedProducts(
  product: Pick<Product, "id" | "category">,
  limit = 4,
): Promise<Product[]> {
  const all = await listProducts({ category: product.category, limit: limit + 1 });
  return all.filter((p) => p.id !== product.id).slice(0, limit);
}

/** Used at build time by `generateStaticParams` on `/product/[slug]`. */
export async function listAllProductSlugs(): Promise<string[]> {
  if (!hasDatabase) {
    return MOCK_PRODUCTS.map((p) => p.slug);
  }
  const rows = await withRetry(() =>
    db.product.findMany({
      where: { archivedAt: null, published: true },
      select: { slug: true },
    }),
  );
  return rows.map((r) => r.slug);
}
