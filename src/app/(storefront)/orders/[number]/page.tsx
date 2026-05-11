"use client";

import * as React from "react";
import Link from "next/link";
import { Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderStatusPill } from "@/components/ui/status-pill";
import { Money } from "@/components/ui/money";
import { useCart, resolveCart } from "@/stores/cart-store";
import { cn } from "@/lib/utils";

interface Step {
  t: string;
  s: string;
  done: boolean;
  current?: boolean;
}

const STEPS: Step[] = [
  { t: "Order placed", s: "2:14 PM today", done: true, current: true },
  { t: "Confirmed", s: "pending", done: false },
  { t: "Shipped", s: "", done: false },
  { t: "Delivered", s: "", done: false },
];

interface PageProps {
  params: { number: string };
}

export default function OrderConfirmationPage({ params }: PageProps) {
  const lines = useCart((s) => s.lines);
  const resolved = React.useMemo(() => resolveCart(lines), [lines]);

  return (
    <div className="px-4 py-6 pb-8">
      <div className="text-center py-5">
        <div className="size-16 mx-auto mb-4 rounded-full bg-brand-accent flex items-center justify-center text-white">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Order confirmed</h1>
        <p className="text-sm text-fg-muted">We&apos;ll text you when it ships.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 mb-3 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-fg-muted">Order</div>
            <div className="font-mono font-bold text-base tabular">#{params.number}</div>
          </div>
          <OrderStatusPill status="confirmed" />
        </div>
        <div className="h-px bg-border" />
        <div className="pt-3 space-y-1">
          {resolved.map((l) => (
            <div
              key={`${l.productId}-${l.variantId}`}
              className="flex justify-between text-[13px] py-0.5"
            >
              <span className="text-fg-muted">
                {l.qty} × {l.product.name}
              </span>
              <Money kobo={l.lineTotalKobo} className="font-semibold" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 mb-3 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2.5">
          <MapPin className="size-4" />
          <div className="font-bold text-[13px]">Estimated delivery: tomorrow by 6pm</div>
        </div>
        <div className="relative py-2">
          <div className="absolute left-[11px] top-3.5 bottom-3.5 w-0.5 bg-border" />
          {STEPS.map((step, i) => (
            <div key={i} className="relative flex items-center gap-3 py-2">
              <div
                className={cn(
                  "size-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-white",
                  step.done ? "bg-brand-accent" : "bg-surface border-2 border-border",
                )}
              >
                {step.done && <Check className="size-3" strokeWidth={3} />}
              </div>
              <div>
                <div
                  className={cn(
                    "text-[13px]",
                    step.current ? "font-bold" : "font-medium",
                    step.done ? "text-fg" : "text-fg-muted",
                  )}
                >
                  {step.t}
                </div>
                {step.s && <div className="text-[11px] text-fg-subtle">{step.s}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link href="/">
        <Button variant="secondary" width="full">
          Continue shopping
        </Button>
      </Link>
    </div>
  );
}
