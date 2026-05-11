"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  max?: number;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  className,
  disabled,
  max,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedSet = new Set(value);

  function toggle(v: string) {
    if (selectedSet.has(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      if (max != null && value.length >= max) return;
      onChange([...value, v]);
    }
  }

  function clear(v: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((x) => x !== v));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm",
            "hover:border-fg-muted focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-brand-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
          )}
        >
          <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
            {value.length === 0 ? (
              <span className="text-fg-subtle">{placeholder}</span>
            ) : (
              value.slice(0, 4).map((v) => {
                const opt = options.find((o) => o.value === v);
                if (!opt) return null;
                return (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-2 text-xs font-semibold"
                  >
                    {opt.label}
                    <span
                      role="button"
                      onClick={(e) => clear(v, e)}
                      className="hover:text-danger"
                    >
                      <X className="size-3" />
                    </span>
                  </span>
                );
              })
            )}
            {value.length > 4 && (
              <span className="text-xs text-fg-muted">+{value.length - 4}</span>
            )}
          </div>
          <ChevronsUpDown className="size-4 text-fg-muted flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <CommandPrimitive className="flex flex-col w-full">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-fg-muted" />
            <CommandPrimitive.Input
              placeholder={searchPlaceholder}
              className="flex h-10 w-full bg-transparent text-sm placeholder:text-fg-subtle outline-none"
            />
          </div>
          <CommandPrimitive.List className="max-h-72 overflow-y-auto p-1">
            <CommandPrimitive.Empty className="py-6 text-center text-xs text-fg-muted">
              No results.
            </CommandPrimitive.Empty>
            {options.map((opt) => {
              const selected = selectedSet.has(opt.value);
              return (
                <CommandPrimitive.Item
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => toggle(opt.value)}
                  className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer text-sm data-[selected=true]:bg-surface-2"
                >
                  <div
                    className={cn(
                      "size-4 rounded-sm border flex items-center justify-center flex-shrink-0",
                      selected
                        ? "bg-brand-primary border-brand-primary text-white"
                        : "border-border-strong",
                    )}
                  >
                    {selected && <Check className="size-3" strokeWidth={3} />}
                  </div>
                  <span className="flex-1">{opt.label}</span>
                </CommandPrimitive.Item>
              );
            })}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}
