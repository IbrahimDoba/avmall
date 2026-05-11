"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberInputProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  /** Suffix label inside the input ("units", "kg") */
  suffix?: string;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, min, max, step = 1, placeholder, disabled, invalid, className, id, suffix }, ref) => {
    function clamp(n: number) {
      if (min != null && n < min) return min;
      if (max != null && n > max) return max;
      return n;
    }

    return (
      <div
        className={cn(
          "flex h-10 w-full rounded-md border bg-surface overflow-hidden",
          "focus-within:shadow-focus focus-within:border-brand-primary",
          disabled && "opacity-50 pointer-events-none",
          invalid ? "border-danger" : "border-border-strong",
          className,
        )}
      >
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => onChange(clamp(value - step))}
          disabled={min != null && value <= min}
          className="w-9 hover:bg-surface-2 text-fg disabled:text-fg-subtle disabled:hover:bg-transparent flex items-center justify-center border-r border-border-strong"
        >
          <Minus className="size-3.5" />
        </button>
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          value={isNaN(value) ? "" : value}
          placeholder={placeholder}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            if (!isNaN(n)) onChange(clamp(n));
            else if (e.target.value === "") onChange(0);
          }}
          className="flex-1 min-w-0 bg-transparent text-center text-sm font-semibold tabular outline-none"
        />
        {suffix && (
          <span className="inline-flex items-center pr-3 text-xs text-fg-muted">{suffix}</span>
        )}
        <button
          type="button"
          aria-label="Increase"
          onClick={() => onChange(clamp(value + step))}
          disabled={max != null && value >= max}
          className="w-9 hover:bg-surface-2 text-fg disabled:text-fg-subtle disabled:hover:bg-transparent flex items-center justify-center border-l border-border-strong"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";
