"use client";

import { cn } from "@/lib/utils";

export interface SavedView {
  id: string;
  label: string;
  /** Optional count badge. */
  count?: number;
}

interface SavedViewBarProps {
  views: SavedView[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Horizontal chip bar for saved filter presets (Orders / Customers / Returns).
 */
export function SavedViewBar({ views, activeId, onChange, className }: SavedViewBarProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1", className)}>
      {views.map((v) => {
        const active = v.id === activeId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
              active
                ? "bg-info-bg border-brand-primary/30 text-brand-primary"
                : "bg-surface border-border text-fg hover:border-border-strong",
            )}
          >
            {v.label}
            {v.count != null && <span className="opacity-60 tabular">{v.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
