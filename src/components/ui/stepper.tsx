"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperItem {
  id: string;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: StepperItem[];
  /** id of the active step. */
  current: string;
  /** ids of completed steps. */
  completed?: string[];
  orientation?: "horizontal" | "vertical";
  onStepClick?: (id: string) => void;
  className?: string;
}

export function Stepper({
  steps,
  current,
  completed = [],
  orientation = "horizontal",
  onStepClick,
  className,
}: StepperProps) {
  const isComplete = (id: string) => completed.includes(id);
  const currentIndex = steps.findIndex((s) => s.id === current);

  if (orientation === "vertical") {
    return (
      <ol className={cn("flex flex-col gap-0.5", className)}>
        {steps.map((s, i) => {
          const done = isComplete(s.id);
          const active = s.id === current;
          return (
            <li key={s.id} className="flex gap-3 relative">
              {i < steps.length - 1 && (
                <span
                  className={cn(
                    "absolute left-3 top-7 bottom-0 w-0.5",
                    done ? "bg-brand-accent" : "bg-border",
                  )}
                />
              )}
              <button
                type="button"
                onClick={onStepClick && (done || active) ? () => onStepClick(s.id) : undefined}
                className={cn(
                  "flex items-center justify-center size-6 rounded-full flex-shrink-0 text-xs font-bold",
                  done && "bg-brand-accent text-white",
                  active && !done && "bg-fg text-bg",
                  !active && !done && "bg-surface-2 text-fg-muted",
                  onStepClick && (done || active) && "cursor-pointer hover:opacity-80",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </button>
              <div className="pb-5">
                <div
                  className={cn(
                    "text-sm",
                    active ? "font-bold text-fg" : done ? "font-semibold text-fg" : "text-fg-muted",
                  )}
                >
                  {s.label}
                </div>
                {s.description && (
                  <div className="text-xs text-fg-muted mt-0.5">{s.description}</div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn("flex items-start gap-2", className)}>
      {steps.map((s, i) => {
        const done = isComplete(s.id);
        const active = s.id === current;
        return (
          <li key={s.id} className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={onStepClick && (done || active) ? () => onStepClick(s.id) : undefined}
              className={cn(
                "flex items-center justify-center size-7 rounded-full text-xs font-bold flex-shrink-0",
                done && "bg-brand-accent text-white",
                active && !done && "bg-fg text-bg",
                !active && !done && "bg-surface-2 text-fg-muted",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </button>
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-sm truncate",
                  active ? "font-bold" : done ? "font-semibold" : "text-fg-muted",
                )}
              >
                {s.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 max-w-12",
                  i < currentIndex ? "bg-brand-accent" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
