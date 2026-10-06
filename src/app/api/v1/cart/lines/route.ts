/**
 * POST /api/v1/cart/lines   { add: "slug:qty[:variantId],…" }
 *   → { lines: CartLine[], skipped: [{ slug, reason }] }
 *
 * Opens a short cart link (/cart?add=…, from the AI's checkout link): turns
 * slugs and quantities into cart lines with live prices and stock. Items that
 * no longer exist or are out of stock are skipped and reported rather than
 * failing the whole link.
 *
 * Public — it only reads published products, the same data a product page
 * shows. Rate-limited per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { AppError, ValidationError } from "@/lib/errors";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { buildCartLines, type CartItemInput } from "@/lib/cart-lines";
import type { CartLine } from "@/stores/cart-store";

export const runtime = "nodejs";

const bodySchema = z.object({ add: z.string().trim().min(1).max(2000) });

/** Parse `slug:qty[:variantId]` entries; malformed ones are dropped. */
function parseAdd(add: string): CartItemInput[] {
  return add
    .split(",")
    .map((part) => part.trim().split(":"))
    .flatMap(([slug, qty, variantId]) => {
      const quantity = Math.floor(Number(qty ?? 1));
      if (!slug || !/^[a-z0-9][a-z0-9-]*$/i.test(slug) || !(quantity >= 1 && quantity <= 999)) return [];
      return [{ productSlug: slug.toLowerCase(), quantity, ...(variantId ? { variantId } : {}) }];
    })
    .slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`cart-lines:${clientIp(req)}`, { limit: 30, windowMs: 5 * 60 * 1000 });
    if (!rl.ok) throw new AppError("RATE_LIMITED", "Too many requests. Try again shortly.", 429);
    if (!hasDatabase) throw new AppError("DB_NOT_CONFIGURED", "Cart requires DATABASE_URL.", 503);

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ValidationError({ add: "Invalid cart link" });
    const items = parseAdd(parsed.data.add);
    if (!items.length) throw new ValidationError({ add: "Invalid cart link" });

    // One at a time, so a sold-out or removed item doesn't sink the rest.
    const lines: CartLine[] = [];
    const skipped: { slug: string; reason: string }[] = [];
    for (const item of items) {
      try {
        const [built] = await buildCartLines([item]);
        if (built) lines.push(built.line);
      } catch (err) {
        skipped.push({
          slug: item.productSlug,
          reason: err instanceof AppError ? err.message : "Unavailable",
        });
      }
    }
    return NextResponse.json(apiSuccess({ lines, skipped }));
  } catch (err) {
    return handleApiError(err);
  }
}
