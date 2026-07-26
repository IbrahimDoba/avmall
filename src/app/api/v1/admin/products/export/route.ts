/**
 * GET /api/v1/admin/products/export
 *
 * Full product catalogue as a CSV — one row per product, every field plus each
 * product's image URLs (image_1 … image_N, N = the most any product has).
 * Money columns are plain Naira numbers (e.g. 4500.00) so spreadsheets treat
 * them as numeric and they import cleanly elsewhere. Permission: products.view.
 */

import { NextRequest } from "next/server";
import { db, hasDatabase } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { toCsv, csvResponse } from "@/lib/csv";
import { handleApiError } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Kobo → plain Naira string (2dp), blank for null. Spreadsheet-numeric. */
const naira = (kobo: bigint | number | null | undefined) =>
  kobo == null ? "" : (Number(kobo) / 100).toFixed(2);

/** Public CDN URL for an R2 image key. */
function imageUrl(key: string): string {
  const base = env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  return base ? `${base}/${key}` : key;
}

export async function GET(_req: NextRequest) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "products.view");

    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Export requires DATABASE_URL.", 503);
    }

    const products = await db.product.findMany({
      orderBy: [{ name: "asc" }],
      take: 20000,
      include: {
        category: { select: { name: true } },
        store: { select: { name: true } },
        variants: {
          where: { archivedAt: null },
          orderBy: { position: "asc" },
          select: { label: true, sku: true, storeStock: { select: { onHand: true } } },
        },
        images: {
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          select: { key: true },
        },
        bulkTiers: {
          orderBy: { min: "asc" },
          select: { min: true, max: true, type: true, value: true },
        },
      },
    });

    // Widen the image columns to whatever the most-photographed product needs.
    const maxImages = products.reduce((m, p) => Math.max(m, p.images.length), 0);
    const imageHeaders = Array.from({ length: maxImages }, (_, i) => `image_${i + 1}`);

    const headers = [
      "name", "brand", "category", "store", "slug",
      "short_description", "long_description",
      "price_naira", "sale_price_naira", "on_sale", "cost_price_naira",
      "stock", "variant_count", "variants", "skus",
      "bulk_tiers", "negotiable", "preorder", "min_order_qty", "eta", "featured",
      "status", "archived", "tags", "created_at", "product_id",
      ...imageHeaders,
    ];

    const dateFmt = new Intl.DateTimeFormat("en-NG", {
      year: "numeric", month: "short", day: "numeric", timeZone: "Africa/Lagos",
    });

    const rows = products.map((p) => {
      const stock = p.variants.reduce(
        (a, v) => a + v.storeStock.reduce((b, s) => b + s.onHand, 0),
        0,
      );
      const variantLabels = p.variants
        .map((v) => v.label)
        .filter((l) => l && l !== "Default")
        .join(" | ");
      const skus = p.variants.map((v) => v.sku).filter(Boolean).join(" | ");
      const tiers = p.bulkTiers
        .map((t) => {
          const range = t.max != null ? `${t.min}-${t.max}` : `${t.min}+`;
          const off = t.type === "percentage" ? `${t.value}%` : `₦${(t.value / 100).toFixed(2)}`;
          return `${range}: ${off}`;
        })
        .join(" | ");
      const imgs = p.images.map((im) => imageUrl(im.key));

      return [
        p.name,
        p.brand,
        p.category?.name ?? "",
        p.store?.name ?? "",
        p.slug,
        p.shortDesc,
        p.longDesc,
        naira(p.priceKobo),
        p.saleActive && p.saleKobo != null ? naira(p.saleKobo) : "",
        p.saleActive ? "Yes" : "No",
        naira(p.costPriceKobo),
        stock,
        p.variants.length,
        variantLabels,
        skus,
        tiers,
        p.negotiate ? "Yes" : "No",
        p.preorder ? "Yes" : "No",
        p.moq ?? "",
        p.eta ?? "",
        p.featured ? "Yes" : "No",
        p.published ? "Published" : "Draft",
        p.archivedAt ? "Yes" : "No",
        p.tags.join("; "),
        dateFmt.format(p.createdAt),
        p.id,
        // Pad the image columns so every row has the same width.
        ...imgs,
        ...Array(maxImages - imgs.length).fill(""),
      ];
    });

    const stamp = dateFmt.format(new Date()).replace(/\s+/g, "-");
    return csvResponse(`avmall-products-${stamp}.csv`, toCsv(headers, rows));
  } catch (err) {
    return handleApiError(err);
  }
}
