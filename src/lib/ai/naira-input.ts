/**
 * Money INPUT for the AI tool endpoints, in Naira.
 *
 * Every tool RESPONSE already speaks Naira ("₦4,500"), so asking the model to
 * send kobo back means it has to multiply by 100 itself — the classic source of
 * 100× errors. These endpoints accept Naira (`offer`, `amount`, `subtotal`) and
 * convert here; the older `*Kobo` fields keep working for existing callers.
 *
 * Accepts a number (4500, 4500.5) or a string as a person would type it
 * ("₦4,500", "4500.00"). Always yields a positive integer kobo.
 */

import { z } from "zod";
import { parseToKobo } from "@/lib/money";

export const nairaInput = z
  .union([z.number(), z.string()])
  .transform((v, ctx) => {
    let kobo: number;
    try {
      kobo = typeof v === "number" ? Math.round(v * 100) : parseToKobo(v);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Not a Naira amount" });
      return z.NEVER;
    }
    if (!Number.isFinite(kobo) || kobo <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be more than ₦0" });
      return z.NEVER;
    }
    return kobo;
  });

/** Same, for a query-string value. Null when absent or unparseable. */
export function nairaParamToKobo(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const r = nairaInput.safeParse(raw);
  return r.success ? r.data : null;
}
