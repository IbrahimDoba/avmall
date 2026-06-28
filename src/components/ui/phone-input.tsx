"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "prefix"> {
  invalid?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, invalid, ...props }, ref) => (
    <div
      className={cn(
        "flex h-10 w-full rounded-md border bg-surface overflow-hidden",
        "focus-within:shadow-focus focus-within:border-brand-primary",
        invalid ? "border-danger" : "border-border-strong",
        className,
      )}
    >
      <span className="inline-flex items-center px-3 bg-surface-2 text-sm font-semibold text-fg-muted border-r border-border-strong tabular">
        +234
      </span>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        aria-invalid={invalid || undefined}
        className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none tabular"
        placeholder="803 421 7790"
        {...props}
      />
    </div>
  ),
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
