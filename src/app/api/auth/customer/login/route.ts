/**
 * POST /api/auth/customer/login
 *
 * Email + password sign-in for storefront customers. Verifies the password and
 * starts a session cookie. Returns a generic error for both unknown email and
 * wrong password so account existence isn't leaked.
 *
 * Body: { email, password }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginWithPassword } from "@/lib/customer-session";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { hasDatabase } from "@/lib/db";
import { AppError, ValidationError, RateLimitedError } from "@/lib/errors";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export async function POST(req: NextRequest) {
  try {
    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Sign-in requires DATABASE_URL.", 503);
    }
    // Throttle brute-force: per-IP (shared networks) + per-email (targeted).
    const ipLimit = rateLimit(`cust-login-ip:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (!ipLimit.ok) {
      throw new RateLimitedError(`Too many attempts — try again in ${ipLimit.retryAfterSec}s`);
    }
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError({
        [issue?.path.join(".") ?? "body"]: issue?.message ?? "Invalid",
      });
    }
    const { email, password } = parsed.data;
    const emailLimit = rateLimit(`cust-login-email:${email.toLowerCase()}`, { limit: 5, windowMs: 60_000 });
    if (!emailLimit.ok) {
      throw new RateLimitedError(`Too many attempts for this account — try again in ${emailLimit.retryAfterSec}s`);
    }
    await loginWithPassword(email, password);
    return NextResponse.json(apiSuccess({ ok: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
