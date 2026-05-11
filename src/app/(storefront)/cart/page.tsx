"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingBag, Shield, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { EmptyState } from "@/components/ui/empty-state";
import { useCart, resolveCart, computeTotals } from "@/stores/cart-store";
import { cn } from "@/lib/utils";

const SHIPPING_KOBO = 250000;

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const resolved = React.useMemo(() => resolveCart(lines), [lines]);

  const [couponInput, setCouponInput] = React.useState("");
  const [coupon, setCoupon] = React.useState<string | null>(null);
  const couponPct = coupon === "WELCOME10" ? 10 : 0;

  const totals = computeTotals(resolved, {
    couponPct,
    shippingKobo: SHIPPING_KOBO,
  });

  if (resolved.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-8" />}
        title="Your cart is empty"
        description="Browse our newest arrivals."
        action={
          <Link href="/">
            <Button>Start shopping</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="pb-6">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-2xl font-bold tracking-tight">Your cart</h1>
        <div className="text-xs text-fg-muted">
          {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}
        </div>
      </div>

      <div className="px-4">
        {resolved.map((line) => (
          <div
            key={`${line.productId}-${line.variantId}`}
            className="flex gap-3 py-3 border-b border-border"
          >
            <div
              className="relative size-19 w-[76px] h-[76px] flex-shrink-0 rounded-md overflow-hidden"
              style={{ background: line.product.bg }}
            >
              <span
                className="absolute bottom-1.5 right-2 text-white font-bold text-xl opacity-70"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {line.product.mark}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-snug">{line.product.name}</div>
              <div className="text-[11px] text-fg-muted mt-0.5">
                {line.variant.label} · {line.product.brand}
              </div>
              {line.bulkLabel && (
                <div className="text-[11px] font-semibold text-brand-accent mt-1">
                  ✓ {line.bulkLabel} applied
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <QuantityStepper
                  value={line.qty}
                  onChange={(q) => setQty(line.productId, line.variantId, q)}
                  size="sm"
                />
                <div className="text-right">
                  <Money kobo={line.lineTotalKobo} className="text-sm font-bold" />
                  {line.bulkDiscountKobo > 0 && (
                    <Money
                      kobo={line.lineSubtotalKobo}
                      variant="strikethrough"
                      className="block text-[11px]"
                    />
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => remove(line.productId, line.variantId)}
              className="self-start p-1 text-fg-subtle hover:text-fg"
              aria-label="Remove"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Coupon */}
      <div className="px-4 pt-4">
        {coupon ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-md bg-success-bg text-success text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Check className="size-3.5" /> Coupon{" "}
              <code className="font-mono">{coupon}</code> applied
            </span>
            <button onClick={() => setCoupon(null)} className="hover:bg-success/10 p-1 rounded">
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              className="flex-1 font-mono"
            />
            <Button variant="secondary" onClick={() => couponInput && setCoupon(couponInput)}>
              Apply
            </Button>
          </div>
        )}
        <p className="text-[11px] text-fg-subtle mt-1.5">
          Try <code className="font-mono">WELCOME10</code>
        </p>
      </div>

      {/* Summary */}
      <div className="px-4 pt-4">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <SummaryRow label="Subtotal" value={<Money kobo={totals.subtotalKobo} />} />
          {totals.bulkDiscountKobo > 0 && (
            <SummaryRow
              label="Bulk discounts"
              value={
                <span className="text-brand-accent">
                  −<Money kobo={totals.bulkDiscountKobo} className="text-brand-accent" />
                </span>
              }
            />
          )}
          {totals.couponDiscountKobo > 0 && (
            <SummaryRow
              label="Coupon"
              value={
                <span className="text-brand-accent">
                  −<Money kobo={totals.couponDiscountKobo} className="text-brand-accent" />
                </span>
              }
            />
          )}
          <SummaryRow label="Shipping (Lagos)" value={<Money kobo={totals.shippingKobo} />} />
          <div className="h-px bg-border my-2.5" />
          <SummaryRow label="Total" value={<Money kobo={totals.totalKobo} />} strong />
          <Link href="/checkout">
            <Button width="full" size="lg" className="mt-3.5">
              Checkout · <Money kobo={totals.totalKobo} />
            </Button>
          </Link>
          <div className="flex items-center gap-1.5 justify-center mt-2.5 text-[11px] text-fg-muted">
            <Shield className="size-3" /> Secure checkout via Nuqood
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between py-1",
        strong ? "text-base font-bold" : "text-[13px]",
      )}
    >
      <span className={strong ? "text-fg" : "text-fg-muted font-medium"}>{label}</span>
      <span className={cn("tabular", strong ? "font-bold" : "font-semibold")}>{value}</span>
    </div>
  );
}
