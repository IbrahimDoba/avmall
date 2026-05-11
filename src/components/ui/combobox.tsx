"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  /** Optional icon or avatar */
  leading?: React.ReactNode;
  /** Optional right-aligned hint (price, count) */
  trailing?: React.ReactNode;
  disabled?: boolean;
}

interface ComboboxProps<T extends string = string> {
  options: ComboboxOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /** Render the trigger label differently from the option label. */
  renderValue?: (option: ComboboxOption<T> | undefined) => React.ReactNode;
}

export function Combobox<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  disabled,
  className,
  renderValue,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm",
            "hover:border-fg-muted focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-brand-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-fg-subtle")}>
            {renderValue ? renderValue(selected) : selected?.label ?? placeholder}
          </span>
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
              {emptyMessage}
            </CommandPrimitive.Empty>
            {options.map((opt) => (
              <CommandPrimitive.Item
                key={opt.value}
                value={`${opt.label} ${opt.description ?? ""}`}
                {...(opt.disabled !== undefined && { disabled: opt.disabled })}
                onSelect={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer text-sm",
                  "data-[selected=true]:bg-surface-2 data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
                )}
              >
                {opt.leading}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{opt.label}</div>
                  {opt.description && (
                    <div className="text-[11px] text-fg-muted truncate">{opt.description}</div>
                  )}
                </div>
                {opt.trailing}
                {opt.value === value && (
                  <Check className="size-4 text-brand-primary" strokeWidth={3} />
                )}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}
