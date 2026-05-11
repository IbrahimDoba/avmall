import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-12", className)}>
      {icon && (
        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-bold mb-1.5">{title}</h2>
      {description && (
        <p className="text-sm text-fg-muted max-w-sm mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
