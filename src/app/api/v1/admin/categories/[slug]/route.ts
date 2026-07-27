/**
 * PATCH  /api/v1/admin/categories/[slug]   Rename a category (products.edit).
 * DELETE /api/v1/admin/categories/[slug]   Delete a category (products.delete).
 *
 * The slug is kept stable across a rename so existing storefront links and
 * saved filters keep working — only the display name changes.
 *
 * Delete is guarded: a category's `categoryId` is required on every product, so
 * a non-empty category can't be dropped without orphaning products. Pass
 * `?moveTo=<slug>` to reassign its products to another category first; without
 * it, deleting a non-empty category is rejected with 409.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, hasDatabase } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(80),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "products.edit");
    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Categories require DATABASE_URL.", 503);
    }

    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new ValidationError({ name: parsed.error.issues[0]?.message ?? "Invalid" });
    }

    const existing = await db.category.findUnique({ where: { slug: params.slug } });
    if (!existing) throw new NotFoundError("Category");

    const category = await db.category.update({
      where: { id: existing.id },
      data: { name: parsed.data.name },
      select: { slug: true, name: true },
    });

    await writeAudit({
      actorUserId: session.id,
      actorType: "staff",
      action: "category.update",
      entityType: "category",
      entityId: existing.id,
      before: { name: existing.name },
      after: { name: category.name },
    });

    return NextResponse.json(apiSuccess({ category }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "products.delete");
    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Categories require DATABASE_URL.", 503);
    }

    const moveTo = req.nextUrl.searchParams.get("moveTo")?.trim() || null;

    const result = await db.$transaction(async (tx) => {
      const category = await tx.category.findUnique({ where: { slug: params.slug } });
      if (!category) throw new NotFoundError("Category");

      const productCount = await tx.product.count({ where: { categoryId: category.id } });

      let movedTo: { slug: string; name: string } | null = null;
      if (productCount > 0) {
        if (!moveTo) {
          // Products would be orphaned (categoryId is required) — refuse.
          throw new AppError(
            "CATEGORY_NOT_EMPTY",
            `This category still has ${productCount} product${productCount === 1 ? "" : "s"}. Move them to another category before deleting.`,
            409,
            { products: String(productCount) },
          );
        }
        if (moveTo === category.slug) {
          throw new ValidationError({ moveTo: "Choose a different destination category" });
        }
        const target = await tx.category.findUnique({
          where: { slug: moveTo },
          select: { id: true, slug: true, name: true },
        });
        if (!target) throw new NotFoundError("Destination category");
        await tx.product.updateMany({
          where: { categoryId: category.id },
          data: { categoryId: target.id },
        });
        movedTo = { slug: target.slug, name: target.name };
      }

      await tx.category.delete({ where: { id: category.id } });

      await writeAudit(
        {
          actorUserId: session.id,
          actorType: "staff",
          action: "category.delete",
          entityType: "category",
          entityId: category.id,
          before: { name: category.name, slug: category.slug, products: productCount },
          after: movedTo ? { movedProductsTo: movedTo.slug } : null,
        },
        tx,
      );

      return { deleted: category.slug, movedProducts: productCount, ...(movedTo && { movedTo }) };
    });

    return NextResponse.json(apiSuccess(result));
  } catch (err) {
    return handleApiError(err);
  }
}
