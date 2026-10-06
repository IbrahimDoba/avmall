/**
 * POST /api/v1/ai/tools/cart/prepare
 *
 * The recommended way for the AI agent to "checkout" a customer: instead of
 * creating an order + Nuqood payment link directly, this tool validates the
 * items, builds a deeplink that pre-loads the customer's browser cart, and
 * lets the customer pay through the normal storefront checkout flow.
 *
 * Why this exists: the cart lives in the customer's browser (localStorage).
 * The AI can't mutate it from the server — but it can hand the customer a
 * URL that does the mutation on click. After clicking, the customer lands on
 * /cart with everything ready, reviews, and clicks Checkout to pay.
 *
 * Body:
 *   {
 *     items: [{ productSlug, quantity, variantId? }]
 *   }
 *
 * Response:
 *   {
 *     cartUrl,                // share this with the customer
 *     itemCount, subtotalKobo, displayTotal,
 *     lines: [{ slug, name, quantity, unitKobo }],
 *     message                 // hint the AI can paraphrase
 *   }
 *
 * Auth: Bearer AI_AGENT_TOKEN
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { lineItemsInput } from "@/lib/ai/tool-input";
import { hasDatabase } from "@/lib/db";
import { requireAiAgent } from "@/lib/ai-auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { formatMoney } from "@/lib/money";
import { AppError, ValidationError } from "@/lib/errors";
import { buildCartLines, cartLinkFor } from "@/lib/cart-lines";

export const runtime = "nodejs";

const bodySchema = z.object({
  // An array, or a JSON string of one (Dailzero can't send arrays).
  items: lineItemsInput,
});

export async function POST(req: NextRequest) {
  try {
    requireAiAgent(req);

    if (!hasDatabase) {
      throw new AppError(
        "DB_NOT_CONFIGURED",
        "Cart prepare requires DATABASE_URL.",
        503,
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError({
        [issue?.path.join(".") ?? "body"]: issue?.message ?? "Invalid",
      });
    }
    const { items } = parsed.data;

    const built = await buildCartLines(items);
    const subtotalKobo = built.reduce((a, b) => a + b.unitKobo * b.line.qty, 0);
    const itemCount = built.reduce((a, b) => a + b.line.qty, 0);
    const summaryLines = built.map((b) => ({
      slug: b.line.snapshot!.slug,
      name: b.name,
      quantity: b.line.qty,
      unit: formatMoney(b.unitKobo),
    }));
    // Short and readable (/cart?add=slug:qty) so the agent pastes it as is;
    // the cart page re-reads the products live when it opens.
    const cartUrl = cartLinkFor(
      built.map((b) => ({ productSlug: b.line.snapshot!.slug, quantity: b.line.qty, variantId: b.line.variantId })),
    );

    return NextResponse.json(
      apiSuccess({
        cartUrl,
        itemCount,
        displayTotal: formatMoney(subtotalKobo),
        currency: "NGN",
        lines: summaryLines,
        message: `Tap the link to open your cart with ${itemCount} item${itemCount === 1 ? "" : "s"} (${formatMoney(subtotalKobo)}). Review, then hit Checkout to pay.`,
      }),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
