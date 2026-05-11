import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  done?: boolean;
  current?: boolean;
  /** Mark as a blocked / error step. */
  blocked?: boolean;
  /** Icon override (lucide component). */
  icon?: React.ReactNode;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
  density?: "compact" | "comfortable";
}

/**
 * Vertical timeline used for order status / audit trails.
 */
export function Timeline({ events, className, density = "comfortable" }: TimelineProps) {
  const pad = density === "compact" ? "py-1.5" : "py-2";

  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" aria-hidden />
      {events.map((e, i) => {
        const ring = e.current
          ? "bg-warning text-white ring-4 ring-warning-bg"
          : e.blocked
            ? "bg-danger-bg text-danger ring-4 ring-danger-bg"
            : e.done
              ? "bg-brand-accent text-white"
              : "bg-surface border-2 border-border";
        return (
          <div key={e.id ?? i} className={cn("relative flex items-start gap-3", pad)}>
            <div
              className={cn(
                "size-6 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                ring,
              )}
            >
              {e.icon ?? (e.done ? <Check className="size-3" strokeWidth={3} /> : null)}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div
                className={cn(
                  "text-sm leading-tight",
                  e.current
                    ? "font-bold text-fg"
                    : e.blocked
                      ? "font-semibold text-danger"
                      : e.done
                        ? "font-semibold text-fg"
                        : "text-fg-muted",
                )}
              >
                {e.title}
              </div>
              {(e.subtitle || e.meta) && (
                <div className="text-[11px] text-fg-muted mt-0.5 flex gap-1.5">
                  {e.subtitle && <span>{e.subtitle}</span>}
                  {e.meta && (
                    <>
                      {e.subtitle && <span>·</span>}
                      <span>{e.meta}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
