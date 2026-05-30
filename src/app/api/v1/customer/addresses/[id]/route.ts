/**
 * PATCH  /api/v1/customer/addresses/[id]  — update fields (handles default toggle)
 * DELETE /api/v1/customer/addresses/[id]  — remove the address
 *
 * When the deleted address was the default, the oldest remaining address is
 * promoted to default automatically so the customer always has one to fall
 * back on (or zero if they removed their last entry).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, hasDatabase } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-session";
import { normaliseNigerianPhone } from "@/lib/phone";
import { writeAudit } from "@/lib/audit";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    label: z.string().min(1).max(40).optional(),
    recipient: z.string().min(1).max(120).optional(),
    phone: z.string().min(7).optional(),
    line1: z.string().min(1).max(200).optional(),
    line2: z.string().max(200).nullable().optional(),
    city: z.string().min(1).max(80).optional(),
    state: z.string().min(1).max(80).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, "No fields to update");

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCustomerSession();
    if (!session) throw new UnauthorizedError();
    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Addresses require DATABASE_URL.", 503);
    }

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError({
        [issue?.path.join(".") ?? "body"]: issue?.message ?? "Invalid",
      });
    }
    const patch = parsed.data;

    const existing = await db.customerAddress.findUnique({ where: { id: params.id } });
    if (!existing || existing.customerId !== session.customerId) {
      throw new NotFoundError("Address");
    }

    let normalisedPhone: string | undefined;
    if (patch.phone !== undefined) {
      try {
        normalisedPhone = normaliseNigerianPhone(patch.phone);
      } catch {
        throw new ValidationError({ phone: "Invalid Nigerian phone number" });
      }
    }

    const updated = await db.$transaction(async (tx) => {
      if (patch.isDefault === true && !existing.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId: session.customerId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.update({
        where: { id: existing.id },
        data: {
          ...(patch.label !== undefined && { label: patch.label.trim() }),
          ...(patch.recipient !== undefined && { recipient: patch.recipient.trim() }),
          ...(normalisedPhone !== undefined && { phone: normalisedPhone }),
          ...(patch.line1 !== undefined && { line1: patch.line1.trim() }),
          ...(patch.line2 !== undefined && {
            line2: patch.line2 === null ? null : patch.line2.trim(),
          }),
          ...(patch.city !== undefined && { city: patch.city.trim() }),
          ...(patch.state !== undefined && { state: patch.state.trim() }),
          ...(patch.isDefault !== undefined && { isDefault: patch.isDefault }),
        },
      });
    });

    await writeAudit({
      actorType: "customer",
      action: "address.update",
      entityType: "customer_address",
      entityId: existing.id,
      before: { label: existing.label, isDefault: existing.isDefault },
      after: { label: updated.label, isDefault: updated.isDefault },
    });

    return NextResponse.json(apiSuccess({ address: updated }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCustomerSession();
    if (!session) throw new UnauthorizedError();
    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Addresses require DATABASE_URL.", 503);
    }

    const existing = await db.customerAddress.findUnique({ where: { id: params.id } });
    if (!existing || existing.customerId !== session.customerId) {
      throw new NotFoundError("Address");
    }

    await db.$transaction(async (tx) => {
      await tx.customerAddress.delete({ where: { id: existing.id } });

      // Promote the oldest remaining address to default if we just removed
      // the default one. Otherwise the customer would have addresses with
      // no default — checkout would have nothing to preselect.
      if (existing.isDefault) {
        const fallback = await tx.customerAddress.findFirst({
          where: { customerId: session.customerId },
          orderBy: { createdAt: "asc" },
        });
        if (fallback) {
          await tx.customerAddress.update({
            where: { id: fallback.id },
            data: { isDefault: true },
          });
        }
      }
    });

    await writeAudit({
      actorType: "customer",
      action: "address.delete",
      entityType: "customer_address",
      entityId: existing.id,
      before: { label: existing.label, isDefault: existing.isDefault },
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
