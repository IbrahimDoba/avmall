import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative rounded-lg border p-4 flex items-start gap-3",
  {
    variants: {
      tone: {
        info: "bg-info-bg border-brand-primary/30 text-info",
        success: "bg-success-bg border-success/30 text-success",
        warning: "bg-warning-bg border-warning/30 text-warning",
        danger: "bg-danger-bg border-danger/30 text-danger",
        neutral: "bg-surface-2 border-border text-fg-muted",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function Alert({
  className,
  tone,
  icon,
  title,
  description,
  action,
  children,
  ...props
}: AlertProps) {
  return (
    <div className={cn(alertVariants({ tone, className }))} {...props}>
      {icon && (
        <div className="flex-shrink-0 mt-0.5" aria-hidden>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && <div className="font-bold text-sm mb-0.5">{title}</div>}
        {description && (
          <div className="text-xs leading-relaxed text-fg-muted">{description}</div>
        )}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
