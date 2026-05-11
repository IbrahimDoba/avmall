"use client";

import * as React from "react";
import { ChevronDown, Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  /** Selected option values. */
  values: string[];
  options: FilterOption[];
  /** Single- vs multi-select dropdown. */
  multi?: boolean;
}

interface FilterChipProps {
  config: FilterConfig;
  onChange: (values: string[]) => void;
}

export function FilterChip({ config, onChange }: FilterChipProps) {
  const summary =
    config.values.length === 0
      ? "Any"
      : config.values.length === 1
        ? (config.options.find((o) => o.value === config.values[0])?.label ?? config.values[0])
        : `${config.values.length} selected`;

  function toggle(v: string) {
    if (!config.multi) {
      onChange(config.values.includes(v) ? [] : [v]);
      return;
    }
    onChange(
      config.values.includes(v) ? config.values.filter((x) => x !== v) : [...config.values, v],
    );
  }

  const active = config.values.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1 px-3 h-9 rounded-md border text-xs font-semibold whitespace-nowrap",
            active
              ? "bg-info-bg border-brand-primary/30 text-brand-primary"
              : "bg-surface border-border-strong text-fg hover:bg-surface-2",
          )}
        >
          <span>{config.label}:</span>
          <span className="font-bold">{summary}</span>
          {active && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="hover:text-danger"
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuLabel>{config.label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {config.options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={config.values.includes(o.value)}
            onCheckedChange={() => toggle(o.value)}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (s: string) => void;
  searchPlaceholder?: string;
  filters: FilterConfig[];
  onFilterChange: (id: string, values: string[]) => void;
  onClear?: () => void;
  className?: string;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  onFilterChange,
  onClear,
  className,
}: FilterBarProps) {
  const hasActive = filters.some((f) => f.values.length > 0);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-3 flex flex-wrap items-center gap-2",
        className,
      )}
    >
      {onSearchChange && (
        <div className="flex items-center gap-2 px-3 h-9 bg-surface-2 rounded-md text-sm text-fg-muted flex-1 min-w-[200px]">
          <Search className="size-4" />
          <input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent outline-none text-fg placeholder:text-fg-subtle"
          />
        </div>
      )}
      {filters.map((f) => (
        <FilterChip
          key={f.id}
          config={f}
          onChange={(values) => onFilterChange(f.id, values)}
        />
      ))}
      {hasActive && onClear && (
        <button
          onClick={onClear}
          className="text-xs font-semibold text-brand-primary hover:underline px-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
