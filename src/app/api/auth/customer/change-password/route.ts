/**
 * POST /api/auth/customer/change-password
 *
 * Change the logged-in customer's password. Existing-password holders must
 * supply the correct current password; OTP-only customers can set one without.
 *
 * Body: { currentPassword?, newPassword }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { changePassword } from "@/lib/customer-session";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { hasDatabase } from "@/lib/db";
import { AppError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Use at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Changing your password requires DATABASE_URL.", 503);
    }
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError({
        [issue?.path.join(".") ?? "body"]: issue?.message ?? "Invalid",
      });
    }
    await changePassword(parsed.data.currentPassword, parsed.data.newPassword);
    return NextResponse.json(apiSuccess({ ok: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
