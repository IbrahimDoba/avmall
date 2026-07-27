/**
 * POST /api/v1/admin/products/bulk-stock
 *
 * Bulk-set product stock from a CSV (the products export, with the `stock`
 * column filled in). Body: { csv: string } — the CSV text, which must have a
 * header row containing a `slug` (or `product_id`) column and a `stock` column.
 *
 * Each row's `stock` becomes the on-hand for that product's single variant at
 * the product's own store. Products with more than one variant are skipped
 * (their per-variant stock is ambiguous from one number) and reported back so
 * they can be set by hand. Rows with a blank stock are ignored, so you can fill
 * in only the ones you want to change. Requires products.stock_adjust.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ csv: z.string().min(1, "CSV is empty") });

/** Minimal RFC-4180 CSV parse — handles quoted cells, commas, and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "products.stock_adjust");

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError({ csv: "Provide the CSV text" });

    const rows = parseCsv(parsed.data.csv);
    if (rows.length < 2) throw new ValidationError({ csv: "CSV has no data rows" });

    const header = rows[0]!.map((h) => h.trim().toLowerCase());
    const slugIdx = header.indexOf("slug");
    const idIdx = header.indexOf("product_id");
    const stockIdx = header.indexOf("stock");
    if (stockIdx === -1 || (slugIdx === -1 && idIdx === -1)) {
      throw new ValidationError({
        csv: "CSV needs a `stock` column and a `slug` (or `product_id`) column",
      });
    }

    // Collect the intended (key → stock) updates. Blank stock = leave as-is.
    const bySlug = new Map<string, number>();
    const byId = new Map<string, number>();
    const invalid: string[] = [];
    for (const r of rows.slice(1)) {
      const raw = (r[stockIdx] ?? "").trim();
      if (raw === "") continue;
      const stock = Number(raw);
      const slug = slugIdx >= 0 ? (r[slugIdx] ?? "").trim() : "";
      const id = idIdx >= 0 ? (r[idIdx] ?? "").trim() : "";
      if (!Number.isInteger(stock) || stock < 0) {
        invalid.push(slug || id || raw);
        continue;
      }
      if (slug) bySlug.set(slug, stock);
      else if (id) byId.set(id, stock);
    }

    if (bySlug.size === 0 && byId.size === 0) {
      throw new ValidationError({ csv: "No rows with a valid stock value to import" });
    }

    // Fetch every referenced product with its non-archived variants + store.
    const products = await db.product.findMany({
      where: {
        OR: [
          ...(bySlug.size ? [{ slug: { in: [...bySlug.keys()] } }] : []),
          ...(byId.size ? [{ id: { in: [...byId.keys()] } }] : []),
        ],
      },
      select: {
        id: true,
        slug: true,
        storeId: true,
        variants: { where: { archivedAt: null }, select: { id: true } },
      },
    });

    const found = new Set<string>();
    const multiVariant: string[] = [];
    let updated = 0;

    for (const p of products) {
      const stock = bySlug.get(p.slug) ?? byId.get(p.id);
      if (stock == null) continue;
      found.add(p.slug);
      found.add(p.id);
      if (p.variants.length !== 1) {
        multiVariant.push(p.slug);
        continue;
      }
      await db.storeStock.upsert({
        where: { storeId_variantId: { storeId: p.storeId, variantId: p.variants[0]!.id } },
        update: { onHand: stock },
        create: { storeId: p.storeId, variantId: p.variants[0]!.id, onHand: stock, reserved: 0 },
      });
      updated += 1;
    }

    const notFound = [
      ...[...bySlug.keys()].filter((s) => !found.has(s)),
      ...[...byId.keys()].filter((i) => !found.has(i)),
    ];

    if (updated > 0) {
      await writeAudit({
        actorUserId: session.id,
        actorType: "staff",
        action: "product.bulk_stock_import",
        entityType: "product",
        entityId: session.id,
        after: { updated, notFound: notFound.length, multiVariant: multiVariant.length, invalid: invalid.length },
      });
    }

    return NextResponse.json(
      apiSuccess({
        updated,
        notFound,
        multiVariant,
        invalid,
        message: `Set stock on ${updated} product(s).`,
      }),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
