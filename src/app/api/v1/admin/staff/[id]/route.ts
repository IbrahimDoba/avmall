/**
 * PATCH /api/v1/admin/staff/:id
 *
 * Update a staff member's role or active status.
 * Requires staff.edit permission (manager+).
 * A super_admin cannot be demoted or disabled by a non-super_admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaffSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

const bodySchema = z.object({
  role: z.enum(["super_admin", "manager", "sales", "inventory", "support"]).optional(),
  active: z.boolean().optional(),
}).refine((d) => d.role !== undefined || d.active !== undefined, {
  message: "Provide at least one of: role, active",
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireStaffSession();
    requirePermission(session, "staff.edit");

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new ValidationError({ body: parsed.error.issues[0]?.message ?? "Invalid" });
    }

    const target = await db.user.findUnique({ where: { id: params.id } });
    if (!target) throw new NotFoundError("Staff member");

    // Only super_admin can touch another super_admin
    if (target.role === "super_admin" && session.role !== "super_admin") {
      throw new ForbiddenError("Only a super admin can modify another super admin");
    }
    // Cannot modify yourself
    if (target.id === session.id) {
      throw new ForbiddenError("Use your profile page to edit your own account");
    }

    const updated = await db.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id: params.id },
        data: {
          ...(parsed.data.role !== undefined && { role: parsed.data.role }),
          ...(parsed.data.active !== undefined && { active: parsed.data.active }),
        },
        select: { id: true, name: true, email: true, role: true, active: true },
      });

      await writeAudit(
        {
          actorUserId: session.id,
          actorType: "staff",
          action: "staff.edit",
          entityType: "user",
          entityId: params.id,
          before: { role: target.role, active: target.active },
          after: { role: next.role, active: next.active },
        },
        tx,
      );

      return next;
    });

    return NextResponse.json(apiSuccess(updated));
  } catch (err) {
    return handleApiError(err);
  }
}
