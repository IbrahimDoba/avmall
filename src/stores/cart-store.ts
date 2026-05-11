"use client";

/**
 * Cart store (Phase 2 client-only — will be replaced by server cart API in Phase 4).
 * Mirrors the future server contract: line items + qty, totals computed via the quote endpoint.
 * For now, the client computes the quote locally using mock product data.
 *
 * See CLAUDE.md §12 — production cart is server-managed via POST /api/v1/cart/:id/quote.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PRODUCTS, type Product, type ProductVariant } from "@/lib/mock-data";
import { applyPercentageDiscount } from "@/lib/money";

export interface CartLine {
  productId: string;
  variantId: string;
  qty: number;
}

export interface ResolvedCartLine extends CartLine {
  product: Product;
  variant: ProductVariant;
  unitKobo: number;
  lineSubtotalKobo: number;
  bulkPct: number;
  bulkLabel: string | null;
  bulkDiscountKobo: number;
  lineTotalKobo: number;
}

interface CartState {
  lines: CartLine[];
  add: (productId: string, variantId: string, qty?: number) => void;
  remove: (productId: string, variantId: string) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  clear: () => void;
}

const SEED_LINES: CartLine[] = [
  { productId: "p2", variantId: "va", qty: 2 },
  { productId: "p5", variantId: "g500", qty: 1 },
];

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: SEED_LINES,
      add: (productId, variantId, qty = 1) =>
        set((state) => {
          const idx = state.lines.findIndex(
            (l) => l.productId === productId && l.variantId === variantId,
          );
          if (idx >= 0) {
            const next = [...state.lines];
            const existing = next[idx]!;
            next[idx] = { ...existing, qty: existing.qty + qty };
            return { lines: next };
          }
          return { lines: [...state.lines, { productId, variantId, qty }] };
        }),
      remove: (productId, variantId) =>
        set((state) => ({
          lines: state.lines.filter(
            (l) => !(l.productId === productId && l.variantId === variantId),
          ),
        })),
      setQty: (productId, variantId, qty) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.productId === productId && l.variantId === variantId
              ? { ...l, qty: Math.max(1, qty) }
              : l,
          ),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: "avmall-cart", version: 1 },
  ),
);

/** Resolve cart lines against the product catalogue and apply bulk pricing. */
export function resolveCart(lines: CartLine[]): ResolvedCartLine[] {
  return lines.flatMap((line) => {
    const product = PRODUCTS.find((p) => p.id === line.productId);
    if (!product) return [];
    const variant = product.variants.find((v) => v.id === line.variantId);
    if (!variant) return [];

    const unitKobo = variant.price ?? (product.saleActive && product.sale ? product.sale : product.price);
    const lineSubtotalKobo = unitKobo * line.qty;

    let bulkPct = 0;
    let bulkLabel: string | null = null;
    for (const tier of product.bulk) {
      if (line.qty >= tier.min && (tier.max == null || line.qty <= tier.max)) {
        bulkPct = tier.value;
        bulkLabel = `${tier.value}% off (${tier.min}+)`;
      }
    }

    const bulkDiscountKobo = applyPercentageDiscount(lineSubtotalKobo, bulkPct);

    return [
      {
        ...line,
        product,
        variant,
        unitKobo,
        lineSubtotalKobo,
        bulkPct,
        bulkLabel,
        bulkDiscountKobo,
        lineTotalKobo: lineSubtotalKobo - bulkDiscountKobo,
      },
    ];
  });
}

export interface CartTotals {
  subtotalKobo: number;
  bulkDiscountKobo: number;
  couponDiscountKobo: number;
  shippingKobo: number;
  totalKobo: number;
  itemCount: number;
}

export function computeTotals(
  resolved: ResolvedCartLine[],
  {
    couponPct = 0,
    shippingKobo = 0,
  }: { couponPct?: number; shippingKobo?: number } = {},
): CartTotals {
  const subtotalKobo = resolved.reduce((a, l) => a + l.lineSubtotalKobo, 0);
  const bulkDiscountKobo = resolved.reduce((a, l) => a + l.bulkDiscountKobo, 0);
  const afterBulk = subtotalKobo - bulkDiscountKobo;
  const couponDiscountKobo = applyPercentageDiscount(afterBulk, couponPct);
  const totalKobo = afterBulk - couponDiscountKobo + shippingKobo;
  const itemCount = resolved.reduce((a, l) => a + l.qty, 0);

  return {
    subtotalKobo,
    bulkDiscountKobo,
    couponDiscountKobo,
    shippingKobo,
    totalKobo,
    itemCount,
  };
}
