"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Swatch {
  id: string;
  label: string;
  /** CSS color or gradient. */
  color: string;
  /** Disable the swatch (e.g. out of stock). */
  disabled?: boolean;
}

interface ColorSwatchPickerProps {
  swatches: Swatch[];
  value?: string;
  onChange?: (id: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Show label text under each swatch. */
  withLabels?: boolean;
}

const sizes = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
} as const;

export function ColorSwatchPicker({
  swatches,
  value,
  onChange,
  size = "md",
  withLabels = false,
  className,
}: ColorSwatchPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2.5", className)}>
      {swatches.map((s) => {
        const selected = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            disabled={s.disabled}
            onClick={() => onChange?.(s.id)}
            aria-label={s.label}
            aria-pressed={selected}
            className={cn(
              "flex flex-col items-center gap-1 group",
              s.disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "relative rounded-full border-2 transition-colors flex items-center justify-center",
                sizes[size],
                selected ? "border-fg" : "border-transparent",
                "ring-1 ring-border-strong",
              )}
            >
              <span
                className="rounded-full block size-full"
                style={{ background: s.color }}
              />
              {selected && (
                <Check
                  className="absolute size-3.5 text-white mix-blend-difference"
                  strokeWidth={3}
                />
              )}
              {s.disabled && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="block w-full h-px rotate-45 bg-fg/40" />
                </span>
              )}
            </span>
            {withLabels && (
              <span
                className={cn(
                  "text-[10px] font-medium",
                  selected ? "text-fg" : "text-fg-muted",
                )}
              >
                {s.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
