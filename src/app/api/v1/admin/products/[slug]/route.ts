/**
 * PATCH  /api/v1/admin/products/:slug   Update product fields.
 * DELETE /api/v1/admin/products/:slug   Hard delete (only when never sold).
 *                                       Use /archive for the soft-delete path.
 *
 * For pricing changes, requires `products.edit_pricing`; for everything else
 * `products.edit`. Stock count changes the default variant's on_hand and
 * goes through `products.stock_adjust`.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  shortDesc: z.string().optional(),
  longDesc: z.string().optional(),
  themeBg: z.string().nullable().optional(),
  priceKobo: z.number().int().positive().optional(),
  saleKobo: z.number().int().positive().nullable().optional(),
  saleActive: z.boolean().optional(),
  /** Default-variant stock. */
  stock: z.number().int().nonnegative().optional(),
  negotiate: z.boolean().optional(),
  preorder: z.boolean().optional(),
  moq: z.number().int().positive().nullable().optional(),
  eta: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "products.edit");

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError({
        [issue?.path.join(".") ?? "body"]: issue?.message ?? "Invalid",
      });
    }
    const b = parsed.data;

    // Pricing changes need a separate permission check.
    const touchingPricing =
      b.priceKobo !== undefined || b.saleKobo !== undefined || b.saleActive !== undefined;
    if (touchingPricing && !hasPermission(session, "products.edit_pricing")) {
      throw new ForbiddenError("Missing permission: products.edit_pricing");
    }

    const touchingStock = b.stock !== undefined;
    if (touchingStock && !hasPermission(session, "products.stock_adjust")) {
      throw new ForbiddenError("Missing permission: products.stock_adjust");
    }

    const updated = await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { slug: params.slug },
        include: { variants: { orderBy: { position: "asc" } } },
      });
      if (!product) throw new NotFoundError("Product");

      let categoryId: string | undefined;
      if (b.categorySlug && b.categorySlug !== "") {
        const cat = await tx.category.findUnique({ where: { slug: b.categorySlug } });
        if (!cat) throw new NotFoundError(`Category ${b.categorySlug}`);
        categoryId = cat.id;
      }

      const before = {
        name: product.name,
        priceKobo: Number(product.priceKobo),
        saleActive: product.saleActive,
        published: product.published,
      };

      const next = await tx.product.update({
        where: { id: product.id },
        data: {
          ...(b.name !== undefined && { name: b.name }),
          ...(b.brand !== undefined && { brand: b.brand }),
          ...(categoryId !== undefined && { categoryId }),
          ...(b.shortDesc !== undefined && { shortDesc: b.shortDesc }),
          ...(b.longDesc !== undefined && { longDesc: b.longDesc }),
          ...(b.themeBg !== undefined && { themeBg: b.themeBg }),
          ...(b.priceKobo !== undefined && { priceKobo: BigInt(b.priceKobo) }),
          ...(b.saleKobo !== undefined && {
            saleKobo: b.saleKobo == null ? null : BigInt(b.saleKobo),
          }),
          ...(b.saleActive !== undefined && { saleActive: b.saleActive }),
          ...(b.negotiate !== undefined && { negotiate: b.negotiate }),
          ...(b.preorder !== undefined && { preorder: b.preorder }),
          ...(b.moq !== undefined && { moq: b.moq }),
          ...(b.eta !== undefined && { eta: b.eta }),
          ...(b.tags !== undefined && { tags: b.tags }),
          ...(b.published !== undefined && { published: b.published }),
          ...(b.featured !== undefined && { featured: b.featured }),
        },
      });

      // Update default-variant stock if asked.
      if (b.stock !== undefined && product.variants[0]) {
        await tx.productVariant.update({
          where: { id: product.variants[0].id },
          data: { onHand: b.stock },
        });
      }

      await writeAudit(
        {
          actorUserId: session.id,
          actorType: "staff",
          action: "product.update",
          entityType: "product",
          entityId: product.id,
          before,
          after: {
            name: next.name,
            priceKobo: Number(next.priceKobo),
            saleActive: next.saleActive,
            published: next.published,
          },
        },
        tx,
      );

      return next;
    });

    return NextResponse.json(
      apiSuccess({ product: { id: updated.id, slug: updated.slug } }),
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "products.delete");

    const product = await db.product.findUnique({
      where: { slug: params.slug },
      include: { orderLines: { take: 1 } },
    });
    if (!product) throw new NotFoundError("Product");

    if (product.orderLines.length > 0) {
      throw new ConflictError(
        "Product has order history — archive it instead of deleting to preserve audit trail",
      );
    }

    await db.product.delete({ where: { id: product.id } });

    await writeAudit({
      actorUserId: session.id,
      actorType: "staff",
      action: "product.delete",
      entityType: "product",
      entityId: product.id,
      before: { slug: product.slug, name: product.name },
    });

    return NextResponse.json(apiSuccess({ deleted: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
