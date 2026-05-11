import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: string;
  trend?: "up" | "down" | "flat";
  sub?: string;
  className?: string;
}

export function StatCard({ label, value, delta, trend, sub, className }: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-brand-accent"
      : trend === "down"
        ? "text-danger"
        : "text-fg-muted";

  return (
    <div className={cn("rounded-lg border border-border bg-surface shadow-sm p-4", className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</div>
      <div className="text-[26px] font-bold tracking-tight tabular mt-2">{value}</div>
      {(delta || sub) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          {delta && (
            <span className={cn("font-bold inline-flex items-center gap-0.5", trendColor)}>
              {trend === "up" && <ArrowUp className="size-3" strokeWidth={3} />}
              {trend === "down" && <ArrowDown className="size-3" strokeWidth={3} />}
              {delta}
            </span>
          )}
          {sub && <span className="text-fg-muted">{sub}</span>}
        </div>
      )}
    </div>
  );
}
