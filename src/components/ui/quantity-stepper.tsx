"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
  disabled,
  className,
}: QuantityStepperProps) {
  const sizeCls = size === "sm" ? "h-7" : "h-10";
  const btn = size === "sm" ? "w-7" : "w-10";

  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(max != null ? Math.min(max, value + 1) : value + 1);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border-strong bg-surface",
        sizeCls,
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={cn(
          "flex items-center justify-center h-full text-fg hover:bg-surface-2 disabled:text-fg-subtle disabled:hover:bg-transparent transition-colors",
          btn,
        )}
      >
        <Minus className="size-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const next = parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (!isNaN(next)) onChange(Math.max(min, max != null ? Math.min(max, next) : next));
        }}
        className={cn(
          "h-full w-11 text-center text-sm font-semibold bg-transparent text-fg tabular outline-none focus:bg-surface-2",
        )}
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={inc}
        disabled={max != null && value >= max}
        aria-label="Increase quantity"
        className={cn(
          "flex items-center justify-center h-full text-fg hover:bg-surface-2 disabled:text-fg-subtle disabled:hover:bg-transparent transition-colors",
          btn,
        )}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
