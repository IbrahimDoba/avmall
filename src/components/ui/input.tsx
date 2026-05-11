import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", invalid, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-sm text-fg",
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
Input.displayName = "Input";

export { Input };
