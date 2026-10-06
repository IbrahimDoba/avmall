/**
 * GET /api/v1/ai/tools/products/search?q=<query>&category=<slug>&limit=<n>
 *
 * Product search for the AI agent. Returns up to `limit` (default 6, max 20)
 * compact product hits suitable for the AI to summarise in a reply.
 *
 * Auth: public — read-only catalogue tool, no token required.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchProductsDetailed, listProducts } from "@/lib/data/products";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { priceFields } from "@/lib/ai/price-fields";
import { env } from "@/lib/env";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Public tool: no auth required — read-only catalogue/quote data.
    const appBaseUrl = env.NEXT_PUBLIC_APP_URL ?? SITE.url;
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim() ?? "";
    const category = sp.get("category")?.trim() ?? undefined;
    const limitParam = Number(sp.get("limit"));
    const limit = Math.min(
      Math.max(1, Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 6),
      20,
    );

    // When `q` is short or missing, return category top picks so the agent
    // has something to suggest. When `q` is set, run the substring search.
    let products;
    let requestedBrands: string[] = [];
    let partial = false;
    if (q.length >= 2) {
      const found = await searchProductsDetailed(q, limit);
      requestedBrands = found.requestedBrands;
      partial = found.partial;
      const wanted = new Set(requestedBrands.map((b) => b.toLowerCase()));
      products = found.hits.map((p) => ({
        id: p.id,
        slug: p.slug,
        productUrl: `${appBaseUrl}/product/${p.slug}`,
        name: p.name,
        brand: p.brand,
        ...(wanted.size > 0 && { isRequestedBrand: wanted.has(p.brand.toLowerCase()) }),
        category: p.category,
        categoryName: p.categoryName,
        description: p.shortDesc,
        status: p.stock > 0 ? "In stock" : "Out of stock",
        // Human-readable Naira — the LLM must never see raw kobo (it reports
        // it as Naira → 100× inflated "millions"). Currency is always NGN.
        ...priceFields(Number(p.priceKobo), p.saleKobo, p.saleActive),
        inStock: p.stock > 0,
        stock: p.stock,
        imageUrl: p.imageUrl,
      }));
    } else {
      const list = await listProducts({
        ...(category && { category }),
        limit,
        featuredFirst: true,
      });
      products = list.map((p) => ({
        id: p.id,
        slug: p.slug,
        productUrl: `${appBaseUrl}/product/${p.slug}`,
        name: p.name,
        brand: p.brand,
        category: p.category,
        categoryName: p.category,
        description: p.short,
        status: p.stock > 0 ? "In stock" : "Out of stock",
        ...priceFields(p.price, p.sale, p.saleActive),
        inStock: p.stock > 0,
        stock: p.stock,
        imageUrl: p.imageUrl,
      }));
    }

    // Dailzero feeds this body to the model verbatim, and a bare `count: 0`
    // next to an empty array is easy to misread as "we have it". Say it in
    // words, and do the same when everything that matched is out of stock.
    const inStockCount = products.filter((p) => p.inStock).length;
    // When they named a brand, other brands in the list are alternatives only.
    const brandLabel = requestedBrands.join(" / ");
    const ofBrand = products.filter((p) => "isRequestedBrand" in p && p.isRequestedBrand);
    const brandMessage =
      requestedBrands.length === 0 || products.length === 0
        ? undefined
        : ofBrand.length === 0
          ? `The customer asked for ${brandLabel}, but nothing from ${brandLabel} matched. These are OTHER brands: say we don't have ${brandLabel} for this, then offer them as alternatives. Never call them ${brandLabel}.`
          : `The customer asked for ${brandLabel}. Only items with isRequestedBrand: true are ${brandLabel}${ofBrand.some((p) => p.inStock) ? "" : " (all of them out of stock right now)"}. Any others are different brands: offer them only as alternatives and name their real brand.`;
    const message =
      products.length === 0
        ? `No products matched "${q}". We do not have this in our catalogue. Tell the customer plainly, suggest another word or brand, or call list_categories. Do NOT say it is available.`
        : partial
          ? `Nothing matches all of "${q}". These only match PART of it, so they are not what the customer asked for. Say plainly that we don't have exactly that; only mention one of these if it is genuinely close, and say how it differs.`
        : inStockCount === 0
          ? "Every product that matched is OUT OF STOCK. Do not offer them as available. Say so, and offer close alternatives (recommend_products) or to notify them when it is back."
          : brandMessage;

    return NextResponse.json(
      apiSuccess({
        query: q,
        ...(category && { category }),
        found: products.length > 0,
        ...(partial && { exactMatch: false }),
        count: products.length,
        inStockCount,
        ...(requestedBrands.length > 0 && { requestedBrands }),
        ...(message && { message }),
        products,
      }),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
