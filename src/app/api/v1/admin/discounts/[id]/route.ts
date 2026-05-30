/**
 * PATCH /api/v1/admin/discounts/[id]
 * DELETE /api/v1/admin/discounts/[id]
 *
 * Once a discount has been redeemed (usage > 0) it's "locked": value, scope,
 * and code can no longer change — only active flag, usageLimit, and validity
 * dates. See CLAUDE.md §20.
 *
 * Delete is hard-delete only while usage is zero. After any redemption, the
 * caller must deactivate instead (the audit history depends on the row
 * remaining).
 *
 * Permission: discounts.edit (PATCH), discounts.delete (DELETE)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    code: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[A-Z0-9_-]+$/)
      .nullable()
      .optional(),
    valueType: z.enum(["percentage", "fixed", "free_shipping"]).optional(),
    value: z.number().int().min(0).optional(),
    scope: z.string().min(1).max(80).optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    validFrom: z.string().datetime().nullable().optional(),
    validUntil: z.string().datetime().nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "discounts.edit");

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError({
        [issue?.path.join(".") ?? "body"]: issue?.message ?? "Invalid",
      });
    }
    const patch = parsed.data;

    const existing = await db.discount.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundError("Discount");

    // Locked = redeemed at least once. Only validity, usageLimit, and active
    // are editable after that.
    if (existing.locked || existing.usage > 0) {
      const lockedKeys = ["name", "code", "valueType", "value", "scope"] as const;
      for (const k of lockedKeys) {
        if (patch[k] !== undefined) {
          throw new ConflictError(
            `Cannot change ${k} — discount has been redeemed (${existing.usage} times)`,
          );
        }
      }
    }

    // Validate cross-field rules on the merged shape.
    const merged = {
      valueType: patch.valueType ?? existing.valueType,
      value: patch.value ?? existing.value,
      validFrom: patch.validFrom !== undefined ? patch.validFrom : existing.validFrom?.toISOString() ?? null,
      validUntil: patch.validUntil !== undefined ? patch.validUntil : existing.validUntil?.toISOString() ?? null,
    };
    if (merged.valueType === "percentage" && (merged.value < 0 || merged.value > 100)) {
      throw new ValidationError({ value: "Percentage must be between 0 and 100" });
    }
    if (merged.valueType === "fixed" && merged.value <= 0) {
      throw new ValidationError({ value: "Fixed amount must be greater than 0" });
    }
    if (
      merged.validFrom &&
      merged.validUntil &&
      new Date(merged.validFrom) >= new Date(merged.validUntil)
    ) {
      throw new ValidationError({ validUntil: "Must be after validFrom" });
    }

    // Uniqueness check when changing code.
    if (patch.code && patch.code !== existing.code) {
      const code = patch.code.toUpperCase();
      const collision = await db.discount.findUnique({ where: { code } });
      if (collision && collision.id !== existing.id) {
        throw new ConflictError(`Code ${code} is already in use`);
      }
    }

    const updated = await db.discount.update({
      where: { id: params.id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.code !== undefined && {
          code: patch.code === null ? null : patch.code.toUpperCase(),
        }),
        ...(patch.valueType !== undefined && { valueType: patch.valueType }),
        ...(patch.value !== undefined && {
          value: patch.valueType === "free_shipping" ? 0 : patch.value,
        }),
        ...(patch.scope !== undefined && { scope: patch.scope }),
        ...(patch.usageLimit !== undefined && { usageLimit: patch.usageLimit }),
        ...(patch.validFrom !== undefined && {
          validFrom: patch.validFrom ? new Date(patch.validFrom) : null,
        }),
        ...(patch.validUntil !== undefined && {
          validUntil: patch.validUntil ? new Date(patch.validUntil) : null,
        }),
        ...(patch.active !== undefined && { active: patch.active }),
      },
    });

    await writeAudit({
      actorUserId: session.id,
      actorType: "staff",
      action: "discount.update",
      entityType: "discount",
      entityId: updated.id,
      before: {
        active: existing.active,
        usageLimit: existing.usageLimit,
        validUntil: existing.validUntil,
      },
      after: {
        active: updated.active,
        usageLimit: updated.usageLimit,
        validUntil: updated.validUntil,
      },
    });

    return NextResponse.json(apiSuccess({ discount: updated }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "discounts.delete");

    const existing = await db.discount.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundError("Discount");

    if (existing.usage > 0) {
      throw new ConflictError(
        "Cannot delete a redeemed discount — deactivate it instead",
      );
    }

    await db.discount.delete({ where: { id: params.id } });

    await writeAudit({
      actorUserId: session.id,
      actorType: "staff",
      action: "discount.delete",
      entityType: "discount",
      entityId: existing.id,
      before: {
        kind: existing.kind,
        code: existing.code,
        name: existing.name,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
