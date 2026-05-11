"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ShoppingBag, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCart } from "@/stores/cart-store";
import { applyPercentageDiscount, formatMoney } from "@/lib/money";
import type { Product } from "@/lib/mock-data";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export function PDPDetail({ product }: { product: Product }) {
  const router = useRouter();
  const add = useCart((s) => s.add);

  const defaultVariant =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0]!;
  const [variantId, setVariantId] = React.useState(defaultVariant.id);
  const [qty, setQty] = React.useState(product.preorder ? (product.moq ?? 1) : 1);

  const variant = product.variants.find((v) => v.id === variantId) ?? defaultVariant;
  const unitKobo =
    variant.price ?? (product.saleActive && product.sale != null ? product.sale : product.price);
  const oos = variant.stock === 0 && !product.preorder;

  let activeBulk = null as typeof product.bulk[number] | null;
  for (const tier of product.bulk) {
    if (qty >= tier.min && (tier.max == null || qty <= tier.max)) activeBulk = tier;
  }
  const bulkSavings = activeBulk
    ? applyPercentageDiscount(unitKobo * qty, activeBulk.value)
    : 0;
  const lineTotal = unitKobo * qty - bulkSavings;

  function handleAdd() {
    if (oos) return;
    add(product.id, variantId, qty);
    toast.success(`${product.name} added to cart`);
    router.push("/cart");
  }

  return (
    <>
      {/* Price block — covers all 6 states */}
      <div className="mb-5">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <Money
            kobo={unitKobo}
            className={cn("text-[28px] font-bold tracking-tight", product.saleActive && "text-danger")}
          />
          {product.saleActive && product.sale != null && (
            <>
              <Money kobo={product.price} variant="strikethrough" className="text-base" />
              <span className="inline-flex items-center text-[11px] font-bold tracking-wider px-2 py-0.5 bg-danger/10 text-danger rounded">
                Save {formatMoney(product.price - product.sale)}
              </span>
            </>
          )}
        </div>
        {product.negotiate && (
          <button className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:underline">
            <MessageCircle className="size-3.5" /> Negotiate this price on WhatsApp
          </button>
        )}
      </div>

      {/* Variants */}
      {product.variants.length > 1 && (
        <div className="mb-4">
          <div className="text-xs font-semibold mb-2">
            Size · <span className="font-normal">{variant.label}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {product.variants.map((v) => {
              const selected = v.id === variantId;
              const out = v.stock === 0;
              return (
                <button
                  key={v.id}
                  disabled={out}
                  onClick={() => setVariantId(v.id)}
                  className={cn(
                    "px-3.5 py-2.5 rounded-md border text-sm font-semibold",
                    selected
                      ? "border-fg bg-fg text-bg"
                      : "border-border-strong bg-surface text-fg",
                    out && "line-through opacity-50 cursor-not-allowed",
                  )}
                >
                  {v.label}
                  {v.price && (
                    <div className="text-[10px] font-medium opacity-80 mt-0.5">
                      {formatMoney(v.price)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity + stock state */}
      <div className="mb-4">
        <div className="text-xs font-semibold mb-2">
          Quantity{" "}
          {product.preorder && (
            <span className="font-normal text-fg-muted">· MOQ {product.moq}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <QuantityStepper
            value={qty}
            onChange={setQty}
            min={product.preorder ? (product.moq ?? 1) : 1}
          />
          {oos ? (
            <div className="text-[13px] text-danger font-semibold">Out of stock</div>
          ) : (
            <div className="text-[13px] text-brand-accent font-semibold flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand-accent" />
              In stock — ships in 24h
            </div>
          )}
        </div>
      </div>

      {/* Bulk pricing table */}
      {product.bulk.length > 0 && (
        <div className="mb-4 p-3.5 rounded-md bg-info-bg border border-brand-primary/20">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="size-3.5" />
            <div className="text-xs font-bold tracking-wide">Bulk pricing</div>
          </div>
          <div className="flex flex-col gap-1">
            {product.bulk.map((tier, i) => {
              const active = activeBulk === tier;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex justify-between text-xs py-0.5",
                    active ? "font-bold text-brand-primary" : "font-medium text-fg",
                  )}
                >
                  <span>
                    {tier.min}
                    {tier.max ? `–${tier.max}` : "+"} units
                  </span>
                  <span>
                    {tier.value}% off {active && "— applied"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="description" className="mt-2">
        <TabsList>
          <TabsTrigger value="description">description</TabsTrigger>
          <TabsTrigger value="shipping">shipping</TabsTrigger>
          <TabsTrigger value="returns">returns</TabsTrigger>
        </TabsList>
        <TabsContent value="description">
          <p className="text-sm text-fg-muted leading-relaxed">
            {product.short}. Crafted in small batches with sustainably-sourced ingredients. Performs as
            both a weekly mask and a spot treatment. Shelf life: 12 months unopened, 6 months once
            opened.
          </p>
        </TabsContent>
        <TabsContent value="shipping">
          <p className="text-sm text-fg-muted leading-relaxed">
            Free shipping in Lagos on orders over ₦25,000. Lagos delivery: 24 hours. Other states:
            2–5 business days. Pickup available at our Ikoyi flagship Mon–Sat 10–7.
          </p>
        </TabsContent>
        <TabsContent value="returns">
          <p className="text-sm text-fg-muted leading-relaxed">
            14-day no-questions returns on unopened items. Refunds processed within 48 hours of
            receipt to your original payment method or as Avmall store credit (5% bonus).
          </p>
        </TabsContent>
      </Tabs>

      {/* Sticky add bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-border p-3 flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-fg-muted">
            Total
          </div>
          <Money kobo={lineTotal} className="text-base font-bold" />
          {bulkSavings > 0 && (
            <div className="text-[10px] font-semibold text-brand-accent">
              Saved {formatMoney(bulkSavings)}
            </div>
          )}
        </div>
        <Button
          onClick={handleAdd}
          disabled={oos}
          size="lg"
          width="full"
          className="flex-1"
        >
          {oos ? "Notify me when back" : product.preorder ? "Pre-order" : "Add to cart"}
          <ShoppingBag className="size-4" />
        </Button>
      </div>
    </>
  );
}
