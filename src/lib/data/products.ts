/**
 * Product data layer. Reads from the DB when DATABASE_URL is set; otherwise
 * returns empty results (no fabricated data).
 *
 * All callers consume the same `Product` view type from mock-data.ts — DB
 * shapes are converted via `productFromDb()`.
 */

import "server-only";

import { cache } from "react";
import { db, hasDatabase, withRetry } from "@/lib/db";
import {
  detectBrands,
  expandSearchTerms,
  hasWord,
  normalizeText,
  requiredWords,
  wordCoverage,
} from "@/lib/search-terms";
import { SEED_PRODUCT_IMAGE_BY_SLUG } from "@/lib/seed-product-images";
import {
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
  ProductImage as DbProductImage,
} from "@prisma/client";
import { Prisma } from "@prisma/client";

type DbVariantWithStock = DbVariant & {
  storeStock: { onHand: number; reserved: number }[];
  // Only the single-product editor loader requests this.
  _count?: { orderLines: number };
};

type DbProductWith = DbProduct & {
  variants: DbVariantWithStock[];
  bulkTiers: DbBulkTier[];
  category: DbCategoryRow;
  images?: DbProductImage[];
};

/**
 * Total on-hand for a variant across whatever store_stock rows were loaded —
 * one store when the query scoped by storeId, all stores (aggregate) when not.
 */
function variantStock(v: { storeStock?: { onHand: number }[] }): number {
  return (v.storeStock ?? []).reduce((a, s) => a + s.onHand, 0);
}

/** Compose the public URL for an R2 key. Returns null when R2 isn't
 *  configured, so the legacy CloudFront fallback can step in. */
function publicUrlForKey(key: string): string | null {
  const base = process.env.R2_PUBLIC_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/${key}`;
}

/** Convert a Prisma product (with relations) into the view-shape used by pages. */
function productFromDb(p: DbProductWith): Product {
  // Image resolution priority:
  //   1. ProductImage rows on R2 (primary first, then by position)
  //   2. Neutral branded placeholder when no image is uploaded
  const sortedImages = [...(p.images ?? [])].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.position - b.position;
  });
  const primaryR2Url = sortedImages
    .map((img) => publicUrlForKey(img.key))
    .find((u): u is string => !!u);
  const galleryR2Urls = sortedImages
    .slice(1)
    .map((img) => publicUrlForKey(img.key))
    .filter((u): u is string => !!u);
  // Carry the R2 keys (not just composed URLs) so the admin editor can persist
  // existing images on save instead of dropping them as keyless entries.
  const imageRecords = sortedImages
    .map((img) => {
      const url = publicUrlForKey(img.key);
      return url
        ? { url, key: img.key, ...(img.alt && { alt: img.alt }), primary: img.isPrimary }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    short: p.shortDesc,
    longDesc: p.longDesc,
    tags: p.tags,
    secondaryCategorySlugs: p.secondaryCategorySlugs,
    mark: p.brand[0]?.toUpperCase() ?? "A",
    category: "home", // overwritten by withCategorySlug() below
    imageUrl: primaryR2Url ?? defaultImageFor(p.slug),
    ...(galleryR2Urls.length > 0 && { gallery: galleryR2Urls }),
    ...(imageRecords.length > 0 && { imageRecords }),
    bg: p.themeBg ?? "linear-gradient(135deg, #ece4d4 0%, #c4a87a 100%)",
    price: Number(p.priceKobo),
    cost: Number(p.costPriceKobo),
    ...(p.saleKobo != null && { sale: Number(p.saleKobo) }),
    saleActive: p.saleActive,
    stock: p.variants.reduce((a, v) => a + variantStock(v), 0),
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
      stock: variantStock(v),
      price: v.priceKobo == null ? null : Number(v.priceKobo),
      ...(v.option1Value && { option1Value: v.option1Value }),
      ...(v.option2Value && { option2Value: v.option2Value }),
      ...(v._count && { orderLineCount: v._count.orderLines }),
    })),
    ...(p.option1Name && { option1Name: p.option1Name }),
    ...(p.option2Name && { option2Name: p.option2Name }),
    published: p.published,
    archived: !!p.archivedAt,
    featured: p.featured,
    negotiate: p.negotiate,
    ...(p.negotiateFloorKobo != null && { negotiateFloor: Number(p.negotiateFloorKobo) }),
    ...(p.negotiateMaxPct != null && { negotiateMaxPct: p.negotiateMaxPct }),
    preorder: p.preorder,
    ...(p.moq != null && { moq: p.moq }),
    ...(p.eta && { eta: p.eta }),
  } as Product;
}


/**
 * Image for a product with no R2 ProductImage row. Seeded demo products resolve
 * their image by slug from the CloudFront export (until Phase 5 moves imagery to
 * R2); everything else falls back to the neutral branded placeholder. Real
 * uploaded images come from ProductImage rows resolved in `productFromDb`.
 */
function defaultImageFor(slug: string): string {
  return SEED_PRODUCT_IMAGE_BY_SLUG[slug] ?? "/product-placeholder.png";
}

/**
 * Hoist the category slug onto the product so the storefront's existing
 * `product.category` access keeps working. Prisma gives us a relation, not a
 * scalar slug — we look it up via the include + categoryById map.
 */
/** Sets the category slug on the converted product. Category is loaded via
 *  Prisma `include`, so no follow-up query needed. */
function finalize(p: DbProductWith): Product {
  const view = productFromDb(p);
  view.category = p.category.slug as ProductCategoryId;
  return view;
}

// ─── Categories ───────────────────────────────────────────────────────────

/**
 * Categories — one query (with product `_count`) instead of two. Wrapped in
 * React `cache` so two callers in the same request share the result.
 */
export const listCategories = cache(async (): Promise<Category[]> => {
  if (!hasDatabase) return [];

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
      return null;
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

/** A category that actually has products in a given store — name, live count,
 *  and a representative image. Drives the storefront nav + homepage grid so
 *  each store shows only its own categories. */
export type StoreCategory = {
  slug: string;
  name: string;
  count: number;
  imageUrl: string;
};

/**
 * Categories that have at least one published product in `storeId` (or across
 * all stores when omitted), each with its in-store product count and a
 * representative image. Unlike `listCategories`, this never returns categories
 * the store doesn't stock — so a sub-store's nav doesn't link to empty pages.
 */
export const listStoreCategories = cache(
  async (storeId?: string): Promise<StoreCategory[]> => {
    if (!hasDatabase) {
      return [];
    }

    const productWhere = {
      archivedAt: null,
      published: true,
      ...(storeId ? { storeId } : {}),
    };

    const cats = await withRetry(() =>
      db.category.findMany({
        where: { products: { some: productWhere } },
        orderBy: { position: "asc" },
        include: {
          _count: { select: { products: { where: productWhere } } },
          products: {
            where: productWhere,
            orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: {
              slug: true,
              images: {
                orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
                take: 1,
                select: { key: true },
              },
            },
          },
        },
      }),
    );

    return cats.map((c) => {
      const sample = c.products[0];
      const imageUrl =
        (sample?.images[0] ? publicUrlForKey(sample.images[0].key) : null) ??
        (sample ? defaultImageFor(sample.slug) : "/product-placeholder.png");
      return {
        slug: c.slug,
        name: c.name,
        count: c._count.products,
        imageUrl,
      };
    });
  },
);

// ─── Products ─────────────────────────────────────────────────────────────

export async function listProducts(opts?: {
  category?: string;
  limit?: number;
  featuredFirst?: boolean;
  /** Return only products flagged `featured` (for the homepage feature grid). */
  featuredOnly?: boolean;
  /** Admin view — return unpublished and archived products too. */
  includeUnpublished?: boolean;
  /** Free-text search across name/brand/slug (case-insensitive substring). */
  search?: string;
  /**
   * Scope stock + availability to one store. When set, only products stocked
   * at that store are returned and `stock` reflects that store. When omitted,
   * stock is the sum across all stores (admin aggregate view).
   */
  storeId?: string;
}): Promise<Product[]> {
  const q = opts?.search?.trim().toLowerCase();

  if (!hasDatabase) {
    return [];
  }

  const where = {
    ...(opts?.storeId && { storeId: opts.storeId }),
    ...(!opts?.includeUnpublished && { archivedAt: null, published: true }),
    ...(opts?.featuredOnly && { featured: true }),
    // Match the primary category OR any secondary category the product is
    // tagged into. AND-wrapped so it never collides with the search `OR` below.
    ...(opts?.category && {
      AND: [
        {
          OR: [
            { category: { slug: opts.category } },
            { secondaryCategorySlugs: { has: opts.category } },
          ],
        },
      ],
    }),
    ...(q && q.length >= 2 && {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { brand: { contains: q, mode: "insensitive" as const } },
        { slug: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };
  // Single query — joins variants, bulkTiers, AND category in one round trip.
  const products = await withRetry(() =>
    db.product.findMany({
      where,
      include: {
        variants: {
          orderBy: { position: "asc" },
          include: {
            storeStock: opts?.storeId
              ? { where: { storeId: opts.storeId } }
              : true,
          },
        },
        bulkTiers: true,
        category: true,
        images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
      },
      orderBy: opts?.featuredFirst
        ? [{ featured: "desc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }],
      ...(opts?.limit != null && { take: opts.limit }),
    }),
  );

  // Products are isolated per store via Product.storeId (filtered above), so
  // the result is already store-scoped.
  return products.map((p) => finalize(p as DbProductWith));
}

export async function getProductBySlug(
  slug: string,
  storeId?: string,
): Promise<Product | null> {
  if (!hasDatabase) {
    return null;
  }
  const p = await withRetry(() =>
    db.product.findUnique({
      where: { slug },
      include: {
        variants: {
          orderBy: { position: "asc" },
          include: {
            storeStock: storeId ? { where: { storeId } } : true,
            // Gate variant deletion in the admin editor — a variant with order
            // history can't be removed.
            _count: { select: { orderLines: true } },
          },
        },
        bulkTiers: true,
        category: true,
        images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
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

/**
 * Search products by name, brand, or slug. Case-insensitive substring match.
 * Returns lightweight rows suitable for a search dropdown — not the full
 * Product view with variants. The storefront-only call so always filters to
 * `published & not archived`.
 */
export interface ProductSearchHit {
  id: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string;
  priceKobo: number;
  saleKobo: number | null;
  saleActive: boolean;
  /** Category slug, e.g. "power". */
  category: string;
  /** Readable category name, e.g. "Power" — for the AI's product table. */
  categoryName: string;
  /** Short description — a specs/capacity hint (e.g. "10,000mAh") for listings. */
  shortDesc: string;
  stock: number;
  /** Variants for the order/POS builder to pick from. A product with a single
   *  default variant has one entry; multi-variant products let staff choose. */
  variants: {
    id: string;
    label: string;
    /** Variant-specific price; null → falls back to the product price. */
    priceKobo: number | null;
    stock: number;
  }[];
}


// Distinct brand list, cached briefly in-memory (brands change rarely). Search
// matches the query against it on every call, so the cache is what keeps that cheap.
let brandCache: { at: number; brands: string[] } | null = null;
async function knownBrands(): Promise<string[]> {
  const now = Date.now();
  if (brandCache && now - brandCache.at < 5 * 60 * 1000) return brandCache.brands;
  const rows = await withRetry(() =>
    db.product.findMany({
      where: { archivedAt: null, published: true },
      select: { brand: true },
      distinct: ["brand"],
    }),
  );
  brandCache = { at: now, brands: rows.map((r) => r.brand).filter(Boolean) };
  return brandCache.brands;
}

export async function searchProducts(
  query: string,
  limit = 8,
  storeId?: string,
): Promise<ProductSearchHit[]> {
  return (await searchProductsDetailed(query, limit, storeId)).hits;
}

/**
 * {@link searchProducts} plus the brands the query named. A brand in the query
 * is the strongest intent signal there is: "oraimo power bank" must rank the
 * Oraimo power bank — even out of stock — above another brand's that's in
 * stock, and the AI needs to know which hits are that brand and which are
 * only alternatives, or it labels a Telexon "an Oraimo".
 */
export async function searchProductsDetailed(
  query: string,
  limit = 8,
  storeId?: string,
): Promise<{
  hits: ProductSearchHit[];
  requestedBrands: string[];
  /** Nothing matched every word asked for; `hits` only match some of it. */
  partial: boolean;
}> {
  const { tokens, terms, norm, tokenTerms } = expandSearchTerms(query);
  if (terms.length === 0 || !hasDatabase) return { hits: [], requestedBrands: [], partial: false };

  const { requested, brandTokens, mergedTerms, mergedTokens, typeTerms } = detectBrands(
    { tokens, terms, norm },
    await knownBrands(),
  );
  const brandNorms = new Set(requested.keys());
  const coverTerms = requiredWords(tokens, tokenTerms, brandTokens);

  const { hits, partial } = await queryProductHits(mergedTerms, mergedTokens, norm, limit, storeId, {
    brands: brandNorms,
    brandNames: [...requested.values()],
    typeTerms,
    coverTerms,
  });
  return { hits, requestedBrands: [...requested.values()], partial };
}

/** Lightweight product shape for the admin category picker. A subset of
 *  {@link ProductSearchHit} — enough to render a row and assign a category. */
export interface CategoryPickerProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string;
  priceKobo: number;
  saleKobo: number | null;
  saleActive: boolean;
  category: string;
  categoryName: string;
}

/**
 * Recent products for the "add products to a category" picker's browse mode.
 * When `notInCategorySlug` is set, products already in that category are
 * excluded so the admin only sees candidates to add. Archived products are
 * never returned.
 */
export async function browseProductsForCategory(
  notInCategorySlug: string | undefined,
  limit = 50,
): Promise<CategoryPickerProduct[]> {
  if (!hasDatabase) return [];

  const products = await withRetry(() =>
    db.product.findMany({
      where: {
        archivedAt: null,
        ...(notInCategorySlug && { category: { slug: { not: notInCategorySlug } } }),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(1, limit), 100),
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 },
      },
    }),
  );

  return products.map((p) => {
    const key = p.images[0]?.key;
    const imageUrl = (key ? publicUrlForKey(key) : null) ?? defaultImageFor(p.slug);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      imageUrl,
      priceKobo: Number(p.priceKobo),
      saleKobo: p.saleKobo != null ? Number(p.saleKobo) : null,
      saleActive: p.saleActive,
      category: p.category.slug,
      categoryName: p.category.name,
    };
  });
}

/** Run the OR search over the given terms and rank the hits. Shared by the
 *  normal search and the fuzzy-corrected retry. */
async function queryProductHits(
  terms: string[],
  tokens: string[],
  norm: string,
  limit: number,
  storeId?: string,
  /** Brands the shopper named (normalised), and the rest of what they asked
   *  for (terms, synonyms included) — e.g. "power bank" in "oraimo power bank". */
  intent: {
    brands: ReadonlySet<string>;
    /** The same brands as stored, for the database lookup. */
    brandNames: string[];
    typeTerms: string[];
    /** Per non-brand query word, what counts as matching it (wordCoverage). */
    coverTerms: string[][];
  } = { brands: new Set(), brandNames: [], typeTerms: [], coverTerms: [] },
): Promise<{ hits: ProductSearchHit[]; partial: boolean }> {
  // Broad candidate net: any expanded term in ANY searchable field — name,
  // brand, slug, both descriptions, the category, or an exact tag. This is what
  // lets "power bank" find a product that only says so in its details, not name.
  const or: Prisma.ProductWhereInput[] = terms.flatMap((term) => [
    { name: { contains: term, mode: "insensitive" } },
    { brand: { contains: term, mode: "insensitive" } },
    { slug: { contains: term, mode: "insensitive" } },
    { shortDesc: { contains: term, mode: "insensitive" } },
    { longDesc: { contains: term, mode: "insensitive" } },
    { category: { name: { contains: term, mode: "insensitive" } } },
    { category: { slug: { contains: term, mode: "insensitive" } } },
  ]);
  or.push({ tags: { hasSome: terms } });

  const include = {
    variants: {
      orderBy: { position: "asc" },
      select: {
        id: true,
        label: true,
        priceKobo: true,
        storeStock: {
          ...(storeId ? { where: { storeId } } : {}),
          select: { onHand: true },
        },
      },
    },
    category: { select: { slug: true, name: true } },
    images: {
      orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
      take: 1,
      select: { key: true },
    },
  } satisfies Prisma.ProductInclude;

  const fetchPool = (where: Prisma.ProductWhereInput, take: number) =>
    withRetry(() =>
      db.product.findMany({
        where: { archivedAt: null, published: true, ...where },
        include,
        // Pull a generous pool ordered by prominence, then rank for relevance
        // below — Postgres can't score our token/synonym logic.
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take,
      }),
    );

  // The broad net is capped, so with a common word in the query ("power") the
  // named brand's own matches can fall outside it. Fetch those separately: that
  // brand's products that also match the rest of the query.
  const typeOr: Prisma.ProductWhereInput[] = intent.typeTerms.flatMap((term) => [
    { name: { contains: term, mode: "insensitive" } },
    { shortDesc: { contains: term, mode: "insensitive" } },
    { category: { name: { contains: term, mode: "insensitive" } } },
  ]);
  if (intent.typeTerms.length) typeOr.push({ tags: { hasSome: intent.typeTerms } });
  const [broad, branded] = await Promise.all([
    fetchPool({ OR: or }, Math.max(limit * 8, 50)),
    intent.brandNames.length
      ? fetchPool(
          {
            AND: [
              { OR: intent.brandNames.map((b) => ({ brand: { equals: b, mode: "insensitive" as const } })) },
              ...(typeOr.length ? [{ OR: typeOr }] : []),
            ],
          },
          50,
        )
      : Promise.resolve([]),
  ]);
  const seen = new Set<string>();
  const rows = [...branded, ...broad].filter((p) => !seen.has(p.id) && !!seen.add(p.id));

  // Relevance: the shopper's own words weigh most, and a hit in the name beats
  // one buried in the long description; synonyms count for less than real
  // words. Matching is by whole word (hasWord): "face" must not score on
  // "surface".
  const scoreOf = (p: (typeof rows)[number]): { s: number; covered: number } => {
    const name = normalizeText(`${p.name} ${p.brand}`);
    const short = normalizeText(p.shortDesc);
    const long = normalizeText(p.longDesc);
    const cat = normalizeText(`${p.category.name} ${p.category.slug}`);
    const tags = normalizeText(p.tags.join(" "));
    const inName = (t: string) => hasWord(name, t);
    let s = 0;
    if (norm.length >= 3 && name.includes(norm)) s += 100; // whole phrase, in the name
    for (const t of tokens) {
      if (inName(t)) s += 10;
      if (hasWord(tags, t)) s += 8;
      if (hasWord(cat, t)) s += 6;
      if (hasWord(short, t)) s += 4;
      if (hasWord(long, t)) s += 2;
    }
    for (const term of terms) {
      if (term === norm || tokens.includes(term)) continue; // real words already scored
      if (inName(term)) s += 5;
      else if (hasWord(cat, term)) s += 4;
      else if (hasWord(tags, term)) s += 4;
      else if (hasWord(short, term)) s += 3;
      else if (hasWord(long, term)) s += 1;
    }
    // How much of what they asked for this product is, brand aside.
    const covered = wordCoverage(`${name} ${tags} ${cat} ${short} ${long}`, intent.coverTerms);
    // The brand they asked for outweighs everything below, stock included: an
    // out-of-stock Oraimo is the honest answer to "oraimo power bank", and the
    // in-stock boost would otherwise hand that slot to another brand.
    // ...but only for products that are also what they asked for: for "oraimo
    // power bank" an Oraimo power bank, not an Oraimo cable.
    if (intent.brands.has(normalizeText(p.brand))) {
      const isWhatTheyWant = intent.coverTerms.length === 0 || covered > 0;
      if (isWhatTheyWant) s += 30;
    }
    // Lead with what's actually in stock — a moderate boost, so a strong exact
    // match that happens to be out of stock still shows, just lower.
    const stk = p.variants.reduce((a, v) => a + v.storeStock.reduce((b, ss) => b + ss.onHand, 0), 0);
    if (stk > 0) s += 8;
    if (p.featured) s += 3;
    return { s, covered };
  };

  const scored = rows
    // Store-scoped search hides products not stocked at that store.
    .filter((p) => (storeId ? p.variants.some((v) => v.storeStock.length > 0) : true))
    .map((p) => ({ p, ...scoreOf(p) }))
    .filter((x) => x.s > 0);

  // Keep only the products that match the most of what was asked. With "face
  // cream", anything that's only a "face" something drops out as soon as one
  // real cream exists; if none does, `partial` says so and the caller tells the
  // shopper instead of passing the leftovers off as a match.
  const want = intent.coverTerms.length;
  const best = scored.reduce((m, x) => Math.max(m, x.covered), 0);
  const kept = want > 0 ? scored.filter((x) => x.covered === best) : scored;
  const partial = want > 0 && best < want;

  const hits = kept
    .sort((a, b) => b.s - a.s || Number(b.p.featured) - Number(a.p.featured))
    .slice(0, limit)
    .map(({ p }) => {
      const r2Url = p.images[0] ? publicUrlForKey(p.images[0].key) : null;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        imageUrl: r2Url ?? defaultImageFor(p.slug),
        priceKobo: Number(p.priceKobo),
        saleKobo: p.saleKobo == null ? null : Number(p.saleKobo),
        saleActive: p.saleActive,
        category: p.category.slug,
        categoryName: p.category.name,
        shortDesc: p.shortDesc,
        stock: p.variants.reduce(
          (a, v) => a + v.storeStock.reduce((b, s) => b + s.onHand, 0),
          0,
        ),
        variants: p.variants.map((v) => ({
          id: v.id,
          label: v.label,
          priceKobo: v.priceKobo == null ? null : Number(v.priceKobo),
          stock: v.storeStock.reduce((b, s) => b + s.onHand, 0),
        })),
      };
    });
  return { hits, partial };
}

/**
 * Audit-panel summary for a single product. Pulls real creator + last editor
 * from AuditLog, and a 30-day units-sold count from OrderLine. Returns empty
 * data when the DB isn't configured.
 */
export interface ProductAuditSummary {
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  sales30d: number;
}

export async function getProductAuditSummary(
  productId: string,
): Promise<ProductAuditSummary> {
  const now = new Date();
  const empty: ProductAuditSummary = {
    createdAt: now,
    createdBy: null,
    updatedAt: now,
    updatedBy: null,
    sales30d: 0,
  };

  if (!hasDatabase) return empty;

  // Bail out cleanly for non-UUID product IDs that wouldn't pass the UUID
  // guard at the DB layer.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    return empty;
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [productRow, createLog, updateLog, salesAgg] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      select: { createdAt: true, updatedAt: true },
    }),
    db.auditLog.findFirst({
      where: {
        entityType: "product",
        entityId: productId,
        action: "product.create",
      },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.auditLog.findFirst({
      where: {
        entityType: "product",
        entityId: productId,
        action: { in: ["product.update", "product.stock_adjust"] },
      },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.orderLine.aggregate({
      _sum: { quantity: true },
      where: {
        productId,
        order: {
          createdAt: { gte: thirtyDaysAgo },
          status: { notIn: ["cancelled"] },
        },
      },
    }),
  ]);

  if (!productRow) return empty;

  return {
    createdAt: productRow.createdAt,
    createdBy: createLog?.actor?.name ?? null,
    updatedAt: productRow.updatedAt,
    updatedBy: updateLog?.actor?.name ?? null,
    sales30d: salesAgg._sum.quantity ?? 0,
  };
}

/** Used at build time by `generateStaticParams` on `/product/[slug]`. */
export async function listAllProductSlugs(): Promise<string[]> {
  if (!hasDatabase) {
    return [];
  }
  const rows = await withRetry(() =>
    db.product.findMany({
      where: { archivedAt: null, published: true },
      select: { slug: true },
    }),
  );
  return rows.map((r) => r.slug);
}

/** Per-product sales totals over a date window. */
export type ProductSales = {
  unitsSold: number;
  /** Net of per-line bulk-tier discounts. Order-level discounts are NOT
   *  apportioned here — see `getProfitAnalysis` for the full P&L treatment. */
  revenueKobo: number;
  ordersCount: number;
};

/**
 * Units and revenue per product for orders placed in a window, keyed by
 * product id. Cancelled orders are excluded; refunded ones are not, since the
 * sale did happen.
 *
 * Revenue is summed in JS rather than via `groupBy` because a line's value is
 * `quantity * unitKobo - bulkDiscountKobo`, which Prisma cannot `_sum` — and
 * the money columns are BigInt, so they need narrowing anyway. The window
 * bounds the row count.
 */
export async function getProductSalesInRange(opts: {
  from?: Date | null;
  to?: Date | null;
  storeId?: string | null;
}): Promise<Map<string, ProductSales>> {
  const sales = new Map<string, ProductSales>();
  if (!hasDatabase) return sales;

  const lines = await withRetry(() =>
    db.orderLine.findMany({
      where: {
        order: {
          ...(opts.storeId ? { storeId: opts.storeId } : {}),
          status: { not: "cancelled" },
          ...(opts.from || opts.to
            ? {
                createdAt: {
                  ...(opts.from ? { gte: opts.from } : {}),
                  ...(opts.to ? { lt: opts.to } : {}),
                },
              }
            : {}),
        },
      },
      select: {
        productId: true,
        orderId: true,
        quantity: true,
        unitKobo: true,
        bulkDiscountKobo: true,
      },
    }),
  );

  // Distinct orders per product, so "Orders" counts orders and not lines.
  const orderIds = new Map<string, Set<string>>();

  for (const l of lines) {
    const cur = sales.get(l.productId) ?? { unitsSold: 0, revenueKobo: 0, ordersCount: 0 };
    cur.unitsSold += l.quantity;
    cur.revenueKobo += Number(l.unitKobo) * l.quantity - Number(l.bulkDiscountKobo);
    sales.set(l.productId, cur);

    const seen = orderIds.get(l.productId) ?? new Set<string>();
    seen.add(l.orderId);
    orderIds.set(l.productId, seen);
  }

  for (const [productId, ids] of orderIds) {
    const cur = sales.get(productId);
    if (cur) cur.ordersCount = ids.size;
  }

  return sales;
}
