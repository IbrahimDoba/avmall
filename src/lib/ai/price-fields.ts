/**
 * How the AI tools state a product's price.
 *
 * They used to send `price` (regular) and `salePrice` (what you pay), and the
 * model kept swapping them — telling a shopper "₦12,500 (was ₦8,400)" for a
 * watch that costs ₦8,400. Now `price` is always what the customer pays
 * today; `regularPrice` appears only when a sale is on, as the struck-out one.
 */

import { formatMoney } from "@/lib/money";

export function priceFields(regularKobo: number, saleKobo: number | null | undefined, saleActive: boolean | undefined) {
  // Same rule the cart charges by: an active sale price is THE price.
  if (!saleActive || saleKobo == null) return { price: formatMoney(regularKobo) };
  return saleKobo < regularKobo
    ? { price: formatMoney(saleKobo), regularPrice: formatMoney(regularKobo), onSale: true as const }
    : { price: formatMoney(saleKobo) };
}
