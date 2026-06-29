/**
 * POST /api/auth/customer/verify-email
 *
 * Confirm the logged-in customer's email with a 6-digit code sent to it via
 * /api/auth/customer/start.
 *
 * Body: { code }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailWithCode } from "@/lib/customer-session";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { hasDatabase } from "@/lib/db";
import { AppError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export async function POST(req: NextRequest) {
  try {
    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Email verification requires DATABASE_URL.", 503);
    }
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError({ code: parsed.error.issues[0]?.message ?? "Invalid" });
    }
    await verifyEmailWithCode(parsed.data.code);
    return NextResponse.json(apiSuccess({ ok: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
