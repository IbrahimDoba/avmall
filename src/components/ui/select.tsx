import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * Native styled <select> — works server-side, no extra deps.
 * Use this for simple option pickers. Use Combobox when search is required.
 */
const Select = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border bg-surface px-3 pr-9 py-2 text-sm text-fg",
          "focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-brand-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-danger" : "border-border-strong",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-fg-muted"
        aria-hidden
      />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
