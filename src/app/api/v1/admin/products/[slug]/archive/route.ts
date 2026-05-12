/**
 * POST   /api/v1/admin/products/:slug/archive  Soft-delete (sets archivedAt)
 * DELETE /api/v1/admin/products/:slug/archive  Un-archive
 *
 * Archived products are hidden from the storefront but remain on past orders.
 * Prefer archiving over hard delete whenever there's order history.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "products.edit");

    const product = await db.product.findUnique({ where: { slug: params.slug } });
    if (!product) throw new NotFoundError("Product");

    await db.product.update({
      where: { id: product.id },
      data: { archivedAt: new Date(), published: false },
    });

    await writeAudit({
      actorUserId: session.id,
      actorType: "staff",
      action: "product.archive",
      entityType: "product",
      entityId: product.id,
    });

    return NextResponse.json(apiSuccess({ archived: true }));
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
    requirePermission(session, "products.edit");

    const product = await db.product.findUnique({ where: { slug: params.slug } });
    if (!product) throw new NotFoundError("Product");

    await db.product.update({
      where: { id: product.id },
      data: { archivedAt: null },
    });

    await writeAudit({
      actorUserId: session.id,
      actorType: "staff",
      action: "product.unarchive",
      entityType: "product",
      entityId: product.id,
    });

    return NextResponse.json(apiSuccess({ archived: false }));
  } catch (err) {
    return handleApiError(err);
  }
}
