import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-20 w-full rounded-md border bg-surface px-3 py-2 text-sm text-fg",
        "placeholder:text-fg-subtle",
        "focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-brand-primary",
        "disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        invalid ? "border-danger" : "border-border-strong",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
