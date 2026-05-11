"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CodeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "pattern"> {
  value: string;
  onChange: (v: string) => void;
  /** Set true to uppercase on input. */
  uppercase?: boolean;
  /** Allow these chars only (default A–Z 0–9 - _). */
  pattern?: RegExp;
  invalid?: boolean;
}

/**
 * Monospace identifier input — SKUs, coupon codes, slugs.
 */
export const CodeInput = React.forwardRef<HTMLInputElement, CodeInputProps>(
  ({ value, onChange, uppercase = true, pattern = /[A-Z0-9\-_]/i, invalid, className, ...props }, ref) => (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => {
        let next = e.target.value;
        if (uppercase) next = next.toUpperCase();
        next = next
          .split("")
          .filter((c) => pattern.test(c))
          .join("");
        onChange(next);
      }}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-sm font-mono tabular tracking-wider text-fg",
        "placeholder:text-fg-subtle",
        "focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-brand-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid ? "border-danger" : "border-border-strong",
        className,
      )}
      {...props}
    />
  ),
);
CodeInput.displayName = "CodeInput";
