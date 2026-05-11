"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}

interface BulkActionsBarProps {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
  className?: string;
}

/**
 * Persistent bar shown when one or more rows are selected.
 */
export function BulkActionsBar({ count, actions, onClear, className }: BulkActionsBarProps) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center gap-3 px-4 py-2.5 bg-fg text-bg",
        className,
      )}
    >
      <button
        onClick={onClear}
        aria-label="Clear selection"
        className="inline-flex items-center justify-center size-7 rounded-md hover:bg-white/10"
      >
        <X className="size-4" />
      </button>
      <span className="text-sm font-semibold">
        <span className="tabular">{count}</span> selected
      </span>
      <span className="flex-1" />
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a) => (
          <Button
            key={a.id}
            size="sm"
            variant={a.destructive ? "destructive" : "ghost"}
            onClick={a.onClick}
            className={a.destructive ? "" : "text-bg hover:bg-white/10"}
          >
            {a.icon}
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
