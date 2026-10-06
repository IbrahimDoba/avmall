/**
 * Input shapes for the AI tool endpoints that take line items or an address.
 *
 * Dailzero tool parameters can only be string / integer / number / boolean —
 * no arrays or objects. So the agent sends `items` as a JSON string and the
 * order's contact and address as flat fields. These helpers accept that AND
 * the structured shape older callers send, so either works.
 */

import { z } from "zod";

/** A JSON string becomes its parsed value; anything else passes through. */
function parseIfJson(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t.startsWith("[") && !t.startsWith("{")) return v;
  try {
    return JSON.parse(t);
  } catch {
    return v; // Let the schema report it as the wrong type.
  }
}

const lineItem = z.object({
  productSlug: z.string().trim().min(1),
  variantId: z.string().uuid().optional(),
  // Models sometimes quote numbers inside JSON ("2").
  quantity: z.coerce.number().int().positive().default(1),
});

/** `items`: an array, a JSON string of one, or a single item object. */
export const lineItemsInput = z.preprocess(
  (v) => {
    const parsed = parseIfJson(v);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? [parsed] : parsed;
  },
  z.array(lineItem).min(1, "At least one item is required"),
);

/**
 * Lift flat order fields (customerName, addressLine1, …) into the nested
 * `contact` / `shipping` objects the order schema expects. A body that
 * already has `contact` / `shipping` (as objects or JSON strings) is kept.
 */
export function nestOrderFields(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const b = { ...(raw as Record<string, unknown>) };
  const str = (k: string) => (typeof b[k] === "string" && b[k] !== "" ? (b[k] as string) : undefined);

  b.contact = parseIfJson(b.contact) ?? {
    name: str("customerName"),
    phone: str("customerPhone"),
    ...(str("customerEmail") && { email: str("customerEmail") }),
  };
  b.shipping = parseIfJson(b.shipping) ?? {
    line1: str("addressLine1"),
    ...(str("addressLine2") && { line2: str("addressLine2") }),
    city: str("city"),
    state: str("state"),
  };
  for (const k of ["customerName", "customerPhone", "customerEmail", "addressLine1", "addressLine2", "city", "state"]) {
    delete b[k];
  }
  return b;
}
