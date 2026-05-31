/**
 * GET /api/v1/checkout/status/[sessionId]
 *
 * Polled by the bank-transfer modal every 3 seconds.
 * Returns current state of a PendingCheckout session.
 *
 * Responses:
 *   pending  → still waiting for payment, returns account details + time remaining
 *   paid     → webhook received, order created → returns orderNumber for redirect
 *   expired  → 30-minute window elapsed, customer must restart
 */

import { NextRequest, NextResponse } from "next/server";
import { db, hasDatabase } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    if (!hasDatabase) {
      throw new AppError("DB_NOT_CONFIGURED", "Database required.", 503);
    }

    const session = await db.pendingCheckout.findUnique({
      where: { id: params.sessionId },
    });

    if (!session) {
      return NextResponse.json(apiSuccess({ status: "expired" }));
    }

    if (session.status === "paid") {
      return NextResponse.json(
        apiSuccess({ status: "paid", orderNumber: session.orderNumber }),
      );
    }

    if (session.expiresAt <= new Date()) {
      // Mark expired so future polls are cheap (no expiry recheck needed)
      await db.pendingCheckout.update({
        where: { id: session.id },
        data: { status: "expired" },
      });
      return NextResponse.json(apiSuccess({ status: "expired" }));
    }

    const secondsLeft = Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    );

    return NextResponse.json(
      apiSuccess({
        status: "pending",
        account: {
          bank: session.bankName,
          number: session.bankNumber,
          name: session.bankAccount,
        },
        amountKobo: Number(session.amountKobo),
        expiresAt: session.expiresAt.toISOString(),
        secondsLeft,
      }),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
