/**
 * POST /api/v1/admin/products/:slug/duplicate
 *
 * Creates an unpublished copy of a product with all variants and bulk tiers.
 * The copy gets slug "{original}-copy" (or "{original}-copy-2" etc. if taken).
 * Returns the new product's slug so the UI can navigate to it.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, hasDatabase } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { AppError, NotFoundError } from "@/lib/errors";

async function uniqueSlug(base: string): Promise<string> {
  let candidate = `${base}-copy`;
  let n = 1;
  while (await db.product.findUnique({ where: { slug: candidate } })) {
    n++;
    candidate = `${base}-copy-${n}`;
  }
  return candidate;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "products.create");

    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Database required.", 503);
    }

    const source = await db.product.findUnique({
      where: { slug: params.slug },
      include: { variants: true, bulkTiers: true },
    });
    if (!source || source.archivedAt) throw new NotFoundError("Product");

    const newSlug = await uniqueSlug(source.slug);

    const copy = await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          slug: newSlug,
          name: `${source.name} (Copy)`,
          brand: source.brand,
          shortDesc: source.shortDesc,
          categoryId: source.categoryId,
          themeBg: source.themeBg,
          priceKobo: source.priceKobo,
          costPriceKobo: source.costPriceKobo,
          saleKobo: source.saleKobo,
          saleActive: false, // don't carry over active sale
          negotiate: source.negotiate,
          negotiateFloorKobo: source.negotiateFloorKobo,
          negotiateMaxPct: source.negotiateMaxPct,
          option1Name: source.option1Name,
          option2Name: source.option2Name,
          published: false, // always start unpublished
          featured: false,
          preorder: source.preorder,
          moq: source.moq,
          eta: source.eta,
          tags: source.tags,
          variants: {
            create: source.variants.map((v, i) => ({
              label: v.label,
              sku: `${v.sku ?? newSlug.toUpperCase()}-V${i + 1}`,
              priceKobo: v.priceKobo,
              onHand: 0, // start with zero stock
              reserved: 0,
              position: v.position,
              option1Value: v.option1Value,
              option2Value: v.option2Value,
            })),
          },
          bulkTiers: {
            create: source.bulkTiers.map((t) => ({
              min: t.min,
              max: t.max,
              type: t.type,
              value: t.value,
            })),
          },
        },
      });

      await writeAudit(
        {
          actorUserId: session.id,
          actorType: "staff",
          action: "product.duplicate",
          entityType: "product",
          entityId: product.id,
          metadata: { sourceSlug: source.slug, newSlug },
        },
        tx,
      );

      return product;
    });

    return NextResponse.json(apiSuccess({ slug: copy.slug, name: copy.name }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
