/**
 * POST /api/v1/admin/products
 *
 * Create a new product with a default variant ("Default") that carries the
 * stock count from the form. Bulk tiers can be created in the same request.
 * Auto-slug if not provided.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

const bodySchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  categorySlug: z.string().min(1),
  shortDesc: z.string().default(""),
  longDesc: z.string().default(""),
  themeBg: z.string().optional(),
  priceKobo: z.number().int().positive(),
  saleKobo: z.number().int().positive().optional(),
  saleActive: z.boolean().default(false),
  /** Initial stock on the default variant. */
  stock: z.number().int().nonnegative().default(0),
  /** Custom slug; auto-derived from name when omitted. */
  slug: z.string().optional(),
  negotiate: z.boolean().default(false),
  preorder: z.boolean().default(false),
  moq: z.number().int().positive().optional(),
  eta: z.string().optional(),
  tags: z.array(z.string()).default([]),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  bulkTiers: z
    .array(
      z.object({
        min: z.number().int().positive(),
        max: z.number().int().positive().nullable().default(null),
        type: z.enum(["percentage", "fixed"]),
        value: z.number().int().nonnegative(),
      }),
    )
    .default([]),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "products.create");

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError({
        [issue?.path.join(".") ?? "body"]: issue?.message ?? "Invalid",
      });
    }
    const b = parsed.data;

    const slug = b.slug?.trim() ? slugify(b.slug) : slugify(b.name);
    if (!slug) throw new ValidationError({ slug: "Could not derive a URL slug" });

    const existing = await db.product.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictError("A product with that slug already exists", { slug });
    }

    const category = await db.category.findUnique({ where: { slug: b.categorySlug } });
    if (!category) throw new NotFoundError(`Category ${b.categorySlug}`);

    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          slug,
          name: b.name,
          brand: b.brand,
          shortDesc: b.shortDesc,
          longDesc: b.longDesc,
          categoryId: category.id,
          themeBg: b.themeBg ?? null,
          priceKobo: BigInt(b.priceKobo),
          ...(b.saleKobo != null && { saleKobo: BigInt(b.saleKobo) }),
          saleActive: b.saleActive,
          negotiate: b.negotiate,
          preorder: b.preorder,
          ...(b.moq != null && { moq: b.moq }),
          ...(b.eta && { eta: b.eta }),
          tags: b.tags,
          published: b.published,
          featured: b.featured,
          variants: {
            create: [
              {
                label: "Default",
                sku: `${b.brand.slice(0, 3).toUpperCase()}-${slug.toUpperCase()}`,
                onHand: b.stock,
                position: 0,
              },
            ],
          },
          ...(b.bulkTiers.length > 0 && {
            bulkTiers: {
              create: b.bulkTiers.map((t) => ({
                min: t.min,
                max: t.max,
                type: t.type,
                value: t.value,
              })),
            },
          }),
        },
      });

      await writeAudit(
        {
          actorUserId: session.id,
          actorType: "staff",
          action: "product.create",
          entityType: "product",
          entityId: created.id,
          after: { slug: created.slug, name: created.name },
        },
        tx,
      );

      return created;
    });

    return NextResponse.json(
      apiSuccess({ product: { id: product.id, slug: product.slug } }),
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
