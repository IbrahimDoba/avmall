/**
 * POST /api/auth/customer/reset-password
 *
 * "Forgot password" — set a new password using a code emailed via
 * /api/auth/customer/start. Verifies + consumes the OTP, sets the new
 * password, and starts a session.
 *
 * Body: { identifier, code, newPassword }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithOtp } from "@/lib/customer-session";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { hasDatabase } from "@/lib/db";
import { AppError, ValidationError, RateLimitedError } from "@/lib/errors";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  identifier: z.string().min(3),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  newPassword: z.string().min(8, "Use at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Password reset requires DATABASE_URL.", 503);
    }
    const limit = await checkRateLimit(`cust-reset:${clientIp(req)}`, { limit: 8, windowMs: 60_000 });
    if (!limit.ok) {
      throw new RateLimitedError(`Too many attempts — try again in ${limit.retryAfterSec}s`);
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError({
        [issue?.path.join(".") ?? "body"]: issue?.message ?? "Invalid",
      });
    }
    const { identifier, code, newPassword } = parsed.data;
    await resetPasswordWithOtp(identifier, code, newPassword);
    return NextResponse.json(apiSuccess({ ok: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
