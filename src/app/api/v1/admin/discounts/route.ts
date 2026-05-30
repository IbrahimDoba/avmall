/**
 * POST /api/v1/admin/discounts
 *
 * Create a coupon or automatic discount.
 *
 * Permission: discounts.create
 *
 * Body:
 *   {
 *     kind: "coupon" | "automatic",
 *     code?: string,            // required when kind="coupon"; uppercased
 *     name: string,
 *     valueType: "percentage" | "fixed" | "free_shipping",
 *     value: number,            // 0-100 for percentage, kobo for fixed, ignored for free_shipping
 *     scope?: string,           // defaults to "all"
 *     usageLimit?: number,
 *     validFrom?: string,       // ISO date
 *     validUntil?: string,      // ISO date
 *     active?: boolean,         // defaults to true
 *   }
 *
 * Response (201): { discount }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    kind: z.enum(["coupon", "automatic"]),
    code: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, digits, hyphens, underscores")
      .optional(),
    name: z.string().min(1).max(120),
    valueType: z.enum(["percentage", "fixed", "free_shipping"]),
    value: z.number().int().min(0).default(0),
    scope: z.string().min(1).max(80).default("all"),
    usageLimit: z.number().int().positive().nullable().optional(),
    validFrom: z.string().datetime().nullable().optional(),
    validUntil: z.string().datetime().nullable().optional(),
    active: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "coupon" && !v.code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["code"],
        message: "Coupons must have a code",
      });
    }
    if (v.valueType === "percentage" && (v.value < 0 || v.value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Percentage must be between 0 and 100",
      });
    }
    if (v.valueType === "fixed" && v.value <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Fixed amount must be greater than 0",
      });
    }
    if (v.validFrom && v.validUntil && new Date(v.validFrom) >= new Date(v.validUntil)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validUntil"],
        message: "validUntil must be after validFrom",
      });
    }
  });

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "discounts.create");

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError({
        [issue?.path.join(".") ?? "body"]: issue?.message ?? "Invalid",
      });
    }
    const data = parsed.data;
    const code = data.code?.toUpperCase();

    if (code) {
      const existing = await db.discount.findUnique({ where: { code } });
      if (existing) {
        throw new ConflictError(`Code ${code} is already in use`);
      }
    }

    const created = await db.discount.create({
      data: {
        kind: data.kind,
        ...(code && { code }),
        name: data.name,
        valueType: data.valueType,
        value: data.valueType === "free_shipping" ? 0 : data.value,
        scope: data.scope,
        ...(data.usageLimit != null && { usageLimit: data.usageLimit }),
        ...(data.validFrom && { validFrom: new Date(data.validFrom) }),
        ...(data.validUntil && { validUntil: new Date(data.validUntil) }),
        active: data.active,
      },
    });

    await writeAudit({
      actorUserId: session.id,
      actorType: "staff",
      action: "discount.create",
      entityType: "discount",
      entityId: created.id,
      after: {
        kind: created.kind,
        code: created.code,
        name: created.name,
        valueType: created.valueType,
        value: created.value,
      },
    });

    return NextResponse.json(apiSuccess({ discount: created }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
