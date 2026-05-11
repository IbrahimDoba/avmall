"use client";

import { formatMoney } from "@/lib/money";
import type { ProductVariant } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface VariantPickerProps {
  variants: ProductVariant[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Pill-style variant selector. Out-of-stock variants are line-through and disabled.
 */
export function VariantPicker({ variants, value, onChange, className }: VariantPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {variants.map((v) => {
        const selected = v.id === value;
        const out = v.stock === 0;
        return (
          <button
            key={v.id}
            type="button"
            disabled={out}
            onClick={() => onChange(v.id)}
            className={cn(
              "px-4 py-2.5 rounded-md border text-sm font-semibold min-w-[80px] transition-colors",
              selected
                ? "border-fg bg-fg text-bg"
                : "border-border-strong bg-surface text-fg hover:border-fg",
              out && "line-through opacity-50 cursor-not-allowed",
            )}
          >
            {v.label}
            {v.price && (
              <div className="text-[11px] font-medium opacity-80 mt-0.5">
                {formatMoney(v.price)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
