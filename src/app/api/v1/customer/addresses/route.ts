/**
 * GET  /api/v1/customer/addresses  — list signed-in customer's addresses
 * POST /api/v1/customer/addresses  — create a new address
 *
 * Customer session required. The first address a customer creates becomes
 * default automatically; subsequent ones default to false unless the body
 * explicitly says otherwise.
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
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";

export const runtime = "nodejs";

const createSchema = z.object({
  label: z.string().min(1).max(40),
  recipient: z.string().min(1).max(120),
  phone: z.string().min(7),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) throw new UnauthorizedError();

    if (!hasDatabase) {
      return NextResponse.json(apiSuccess({ addresses: [] }));
    }

    const addresses = await db.customerAddress.findMany({
      where: { customerId: session.customerId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(apiSuccess({ addresses }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession();
    if (!session) throw new UnauthorizedError();

    if (!hasDatabase) {
      throw new AppError(
        "DB_NOT_CONFIGURED",
        "Addresses require DATABASE_URL.",
        503,
      );
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError({
        [issue?.path.join(".") ?? "body"]: issue?.message ?? "Invalid",
      });
    }
    const data = parsed.data;

    let normalisedPhone: string;
    try {
      normalisedPhone = normaliseNigerianPhone(data.phone);
    } catch {
      throw new ValidationError({ phone: "Invalid Nigerian phone number" });
    }

    const created = await db.$transaction(async (tx) => {
      const existing = await tx.customerAddress.count({
        where: { customerId: session.customerId },
      });
      const shouldBeDefault = data.isDefault ?? existing === 0;

      // If this one is being set default, clear the flag elsewhere.
      if (shouldBeDefault && existing > 0) {
        await tx.customerAddress.updateMany({
          where: { customerId: session.customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const row = await tx.customerAddress.create({
        data: {
          customerId: session.customerId,
          label: data.label.trim(),
          recipient: data.recipient.trim(),
          phone: normalisedPhone,
          line1: data.line1.trim(),
          line2: data.line2?.trim() ?? null,
          city: data.city.trim(),
          state: data.state.trim(),
          isDefault: shouldBeDefault,
        },
      });

      await writeAudit(
        {
          actorType: "customer",
          action: "address.create",
          entityType: "customer_address",
          entityId: row.id,
          after: { label: row.label, city: row.city, state: row.state },
        },
        tx,
      );

      return row;
    });

    return NextResponse.json(apiSuccess({ address: created }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
