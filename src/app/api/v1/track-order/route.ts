/**
 * POST /api/v1/track-order
 *
 * Guest order tracking. The previous flow let any visitor view any order
 * by URL — easy enumeration attack. We now require BOTH order number AND
 * the shipping phone (which only the customer would know), with the same
 * generic error for any mismatch so we never confirm or deny that a given
 * order number exists (CLAUDE.md §19).
 *
 * On success we set a short-lived signed cookie ("track-grants") naming
 * this order, then redirect the customer to /orders/[number]. The order
 * detail page checks the cookie before rendering for unauthenticated
 * visitors.
 *
 * Rate-limited to 10 attempts / 15 minutes / IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, hasDatabase } from "@/lib/db";
import { normaliseNigerianPhone } from "@/lib/phone";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { setGrantCookie, GRANT_COOKIE } from "@/lib/track-grant";
import { handleApiError } from "@/lib/api-response";
import { AppError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  orderNumber: z.string().min(1),
  phone: z.string().min(7),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`track-order:${ip}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Too many attempts. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.`,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError({ body: "Order number and phone are required" });
    }

    if (!hasDatabase) {
      throw new AppError(
        "DB_NOT_CONFIGURED",
        "Order tracking requires DATABASE_URL",
        503,
      );
    }

    let normalisedPhone: string;
    try {
      normalisedPhone = normaliseNigerianPhone(parsed.data.phone);
    } catch {
      // Don't leak the validation distinction — same generic response.
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message:
              "Couldn't find that order. Double-check the order number and phone, then try again.",
          },
        },
        { status: 404 },
      );
    }

    const order = await db.order.findFirst({
      where: {
        number: parsed.data.orderNumber.trim().toUpperCase(),
        shipPhone: normalisedPhone,
      },
      select: { number: true },
    });

    if (!order) {
      // Same generic response for "order doesn't exist" vs "phone doesn't
      // match" — prevents confirming whether an order number is real.
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message:
              "Couldn't find that order. Double-check the order number and phone, then try again.",
          },
        },
        { status: 404 },
      );
    }

    const res = NextResponse.json({
      data: { orderNumber: order.number, redirectTo: `/orders/${order.number}` },
    });
    setGrantCookie(res.cookies, order.number, req.cookies.get(GRANT_COOKIE)?.value);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
