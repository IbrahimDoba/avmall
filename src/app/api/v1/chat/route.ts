/**
 * POST /api/v1/chat — the website chat widget's backend.
 *
 *   { conversationId: uuid, turnId: uuid, messages: [{ role, content }, …] }
 *   → { reply: markdown, products: ChatProductCard[] }
 *
 * Proxies one turn to the Dailzero "widget" agent (which runs our AI tools),
 * then re-reads every product the reply links from our database so the cards
 * show live prices and stock. The Dailzero key stays on the server.
 *
 * Every call spends Dailzero credits, so it's public but bounded: per-IP rate
 * limits, capped message size and history, and `turnId` as the idempotency key
 * so a retried send replays the first answer instead of paying for a second.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { AppError, ValidationError } from "@/lib/errors";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { createDailzeroClient, DailzeroError } from "@/lib/dailzero";
import { productCardsFor } from "@/lib/ai/chat-cards";
import { CHAT_LIMITS, type ChatReply } from "@/lib/ai/chat-types";

export const runtime = "nodejs";
// A turn that calls several tools can take a while.
export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  turnId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(60),
});

const LIMITS = [
  { key: "burst", limit: 12, windowMs: 5 * 60 * 1000 },
  { key: "day", limit: 120, windowMs: 24 * 60 * 60 * 1000 },
] as const;

/** Most recent turns that fit the caps, starting on a user turn. */
function trimHistory(messages: z.infer<typeof bodySchema>["messages"]) {
  const kept: typeof messages = [];
  let chars = 0;
  for (let i = messages.length - 1; i >= 0 && kept.length < CHAT_LIMITS.maxHistory; i--) {
    const m = messages[i]!;
    if (chars + m.content.length > CHAT_LIMITS.maxHistoryChars && kept.length > 0) break;
    kept.unshift(m);
    chars += m.content.length;
  }
  while (kept.length > 1 && kept[0]!.role !== "user") kept.shift();
  return kept;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = env.DAILZERO_API_KEY;
    const agentId = env.DAILZERO_WIDGET_AGENT_ID;
    if (!apiKey || !agentId) {
      throw new AppError("CHAT_NOT_CONFIGURED", "Chat is not available right now.", 503);
    }

    const ip = clientIp(req);
    for (const l of LIMITS) {
      const rl = await checkRateLimit(`chat-${l.key}:${ip}`, l);
      if (!rl.ok) {
        return NextResponse.json(
          {
            error: {
              code: "RATE_LIMITED",
              message:
                l.key === "burst"
                  ? "You're sending messages quickly. Give it a minute and try again."
                  : "You've reached today's chat limit. Message us on WhatsApp and we'll help you there.",
            },
          },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
        );
      }
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ValidationError({ body: "Invalid chat request" });
    const { conversationId, turnId, messages } = parsed.data;

    const last = messages[messages.length - 1]!;
    if (last.role !== "user") throw new ValidationError({ messages: "The last message must be the customer's" });
    if (last.content.length > CHAT_LIMITS.maxMessageChars) {
      throw new ValidationError({
        messages: `Please keep messages under ${CHAT_LIMITS.maxMessageChars} characters.`,
      });
    }

    const dz = createDailzeroClient(apiKey);
    const res = await dz.chat({
      agentId,
      messages: trimHistory(messages),
      conversationId: `web-${conversationId}`,
      idempotencyKey: `web-${conversationId}-${turnId}`,
    });

    const reply = res.message.content.trim();
    const products = await productCardsFor(reply);
    return NextResponse.json(apiSuccess<ChatReply>({ reply, products }));
  } catch (err) {
    // Upstream trouble (out of credits, rate limited, down) is ours to fix, not
    // the shopper's to read about: log the detail, show a way forward.
    if (err instanceof DailzeroError) {
      console.error("[chat] dailzero:", err.upstreamCode, err.message);
      return NextResponse.json(
        {
          error: {
            code: "CHAT_UNAVAILABLE",
            message: "Our assistant is having trouble right now. Please try again shortly, or message us on WhatsApp.",
          },
        },
        { status: 502 },
      );
    }
    return handleApiError(err);
  }
}
