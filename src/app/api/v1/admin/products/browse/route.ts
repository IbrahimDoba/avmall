/**
 * GET /api/v1/admin/products/browse?notInCategory=<slug>&limit=<n>
 *
 * Recent products for the admin category picker's browse mode — lets staff
 * batch-assign products to a category without knowing their names. Pass
 * `notInCategory` to exclude products already in that category.
 *
 * Permission: products.view
 */

import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { browseProductsForCategory } from "@/lib/data/products";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "products.view");

    const notInCategory = req.nextUrl.searchParams.get("notInCategory")?.trim() || undefined;
    const limitParam = Number(req.nextUrl.searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;

    const products = await browseProductsForCategory(notInCategory, limit);
    return NextResponse.json(apiSuccess({ products }));
  } catch (err) {
    return handleApiError(err);
  }
}
