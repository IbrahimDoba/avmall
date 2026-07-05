/**
 * Export every product to a CSV (one row per product).
 *
 *   tsx --env-file=.env.local scripts/export-products-csv.ts
 *
 * Writes products-export.csv in the repo root. Money columns are in Naira
 * (plain numbers, so spreadsheets treat them as numeric). Stock is total
 * on-hand summed across the product's (non-archived) variants.
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

async function main() {
  // Wake Neon if it's cold.
  for (let i = 0; i < 8; i++) {
    try { await db.$queryRaw`SELECT 1`; break; } catch { await new Promise((r) => setTimeout(r, 2000)); }
  }

  const products = await db.product.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true, name: true, brand: true, slug: true,
      priceKobo: true, saleKobo: true, saleActive: true, costPriceKobo: true,
      published: true, archivedAt: true, preorder: true, featured: true,
      tags: true, createdAt: true,
      category: { select: { name: true } },
      store: { select: { name: true } },
      variants: { where: { archivedAt: null }, select: { storeStock: { select: { onHand: true } } } },
    },
  });

  const headers = [
    "name", "brand", "category", "store", "slug",
    "price_naira", "sale_price_naira", "cost_price_naira",
    "stock", "variants", "status", "archived", "preorder", "featured",
    "tags", "created_at", "product_id",
  ];

  const lagos = new Intl.DateTimeFormat("en-NG", { year: "numeric", month: "short", day: "numeric", timeZone: "Africa/Lagos" });

  const rows = products.map((p) => {
    const stock = p.variants.reduce((a, v) => a + v.storeStock.reduce((b, s) => b + s.onHand, 0), 0);
    return [
      p.name, p.brand, p.category?.name ?? "", p.store?.name ?? "", p.slug,
      naira(p.priceKobo),
      p.saleActive && p.saleKobo != null ? naira(p.saleKobo) : "",
      naira(p.costPriceKobo),
      stock, p.variants.length,
      p.published ? "Published" : "Draft",
      p.archivedAt ? "Yes" : "No",
      p.preorder ? "Yes" : "No",
      p.featured ? "Yes" : "No",
      p.tags.join("; "),
      lagos.format(p.createdAt),
      p.id,
    ].map(cell).join(",");
  });

  writeFileSync(OUT, [headers.join(","), ...rows].join("\n") + "\n", "utf8");
  const active = products.filter((p) => !p.archivedAt).length;
  console.log(`Wrote ${OUT} — ${products.length} products (${active} active, ${products.length - active} archived).`);
}

main().catch((e) => console.error("ERR:", e)).finally(() => db.$disconnect());
