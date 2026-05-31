/**
 * POST /api/v1/admin/orders/:number/status
 *
 * Advance an order through its status state machine.
 * Valid transitions (CLAUDE.md Appendix A):
 *   pending    → confirmed
 *   confirmed  → processing
 *   processing → shipped   (also calls consumeReservations + emails customer)
 *   shipped    → delivered
 *
 * Cancel is handled by /cancel. Refund is handled separately.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { consumeReservations } from "@/lib/stock";
import { writeAudit } from "@/lib/audit";
import { emailOnOrderShipped } from "@/lib/order-emails";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

const VALID_TRANSITIONS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "shipped",
  shipped: "delivered",
};

const bodySchema = z.object({
  status: z.enum(["confirmed", "processing", "shipped", "delivered"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { number: string } },
) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "orders.edit");

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError({ status: "Invalid status" });

    const { status: newStatus } = parsed.data;

    const updated = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { number: params.number },
        include: { reservations: { where: { status: "active" } } },
      });
      if (!order) throw new NotFoundError("Order");

      const allowed = VALID_TRANSITIONS[order.status];
      if (allowed !== newStatus) {
        throw new ConflictError(
          `Cannot move from "${order.status}" to "${newStatus}". Expected next: "${allowed ?? "none (terminal)"}"`,
        );
      }

      // shipping consumes stock reservations
      if (newStatus === "shipped") {
        await consumeReservations(
          tx,
          order.reservations.map((r) => r.id),
        );
      }

      const next = await tx.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          ...(newStatus === "shipped" && { shippedAt: new Date() }),
        },
      });

      await writeAudit(
        {
          actorUserId: session.id,
          actorType: "staff",
          action: `order.${newStatus}`,
          entityType: "order",
          entityId: order.id,
          before: { status: order.status },
          after: { status: newStatus },
        },
        tx,
      );

      return next;
    });

    if (newStatus === "shipped") {
      void emailOnOrderShipped(updated.id, {});
    }

    return NextResponse.json(apiSuccess({ status: updated.status }));
  } catch (err) {
    return handleApiError(err);
  }
}
