/**
 * Export every product to a CSV (one row per product), with all fields plus
 * each product's image URLs (image_1 … image_N).
 *
 *   tsx --env-file=.env.local scripts/export-products-csv.ts
 *
 * Writes products-export.csv in the repo root. Money columns are in Naira
 * (plain numbers, so spreadsheets treat them as numeric). Stock is total
 * on-hand summed across the product's (non-archived) variants. Image URLs need
 * R2_PUBLIC_URL set (same env the app uses).
 */
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const OUT = "products-export.csv";

/** RFC-4180 CSV cell: wrap in quotes when it contains a comma, quote or newline. */
function cell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const naira = (kobo: bigint | number | null | undefined) =>
  kobo == null ? "" : (Number(kobo) / 100).toFixed(2);

const imageUrl = (key: string) => {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  return base ? `${base}/${key}` : key;
};

async function main() {
  // Wake Neon if it's cold.
  for (let i = 0; i < 8; i++) {
    try { await db.$queryRaw`SELECT 1`; break; } catch { await new Promise((r) => setTimeout(r, 2000)); }
  }

  const products = await db.product.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true, name: true, brand: true, slug: true,
      shortDesc: true, longDesc: true,
      priceKobo: true, saleKobo: true, saleActive: true, costPriceKobo: true,
      negotiate: true, preorder: true, moq: true, eta: true,
      published: true, archivedAt: true, featured: true,
      tags: true, createdAt: true,
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

  const headers = [
    "name", "brand", "category", "store", "slug",
    "short_description", "long_description",
    "price_naira", "sale_price_naira", "cost_price_naira",
    "stock", "variant_count", "variants", "skus",
    "bulk_tiers", "negotiable", "preorder", "min_order_qty", "eta", "featured",
    "status", "archived", "tags", "created_at", "product_id",
    ...Array.from({ length: maxImages }, (_, i) => `image_${i + 1}`),
  ];

  const lagos = new Intl.DateTimeFormat("en-NG", { year: "numeric", month: "short", day: "numeric", timeZone: "Africa/Lagos" });

  const rows = products.map((p) => {
    const stock = p.variants.reduce((a, v) => a + v.storeStock.reduce((b, s) => b + s.onHand, 0), 0);
    const variantLabels = p.variants.map((v) => v.label).filter((l) => l && l !== "Default").join(" | ");
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
      p.name, p.brand, p.category?.name ?? "", p.store?.name ?? "", p.slug,
      p.shortDesc, p.longDesc,
      naira(p.priceKobo),
      p.saleActive && p.saleKobo != null ? naira(p.saleKobo) : "",
      naira(p.costPriceKobo),
      stock, p.variants.length, variantLabels, skus,
      tiers,
      p.negotiate ? "Yes" : "No",
      p.preorder ? "Yes" : "No",
      p.moq ?? "",
      p.eta ?? "",
      p.featured ? "Yes" : "No",
      p.published ? "Published" : "Draft",
      p.archivedAt ? "Yes" : "No",
      p.tags.join("; "),
      lagos.format(p.createdAt),
      p.id,
      ...imgs,
      ...Array(maxImages - imgs.length).fill(""),
    ].map(cell).join(",");
  });

  writeFileSync(OUT, [headers.join(","), ...rows].join("\n") + "\n", "utf8");
  const active = products.filter((p) => !p.archivedAt).length;
  const withImages = products.filter((p) => p.images.length > 0).length;
  console.log(
    `Wrote ${OUT} — ${products.length} products (${active} active, ${products.length - active} archived), ` +
      `${withImages} with images, up to ${maxImages} image columns.`,
  );
}

main().catch((e) => console.error("ERR:", e)).finally(() => db.$disconnect());
