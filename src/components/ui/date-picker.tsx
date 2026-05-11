"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  minDate,
  maxDate,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm",
            "hover:border-fg-muted focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-brand-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !value && "text-fg-subtle",
            className,
          )}
        >
          <CalendarIcon className="size-4 text-fg-muted flex-shrink-0" />
          <span className="flex-1 text-left">
            {value ? format(value, "PPP") : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => onChange?.(d)}
          required={false}
          disabled={
            minDate || maxDate
              ? (d: Date) => (minDate && d < minDate) || (maxDate && d > maxDate) || false
              : false
          }
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  value?: { from: Date | undefined; to?: Date | undefined };
  onChange?: (range: { from: Date | undefined; to?: Date | undefined } | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  disabled,
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm",
            "hover:border-fg-muted focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-brand-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !value?.from && "text-fg-subtle",
            className,
          )}
        >
          <CalendarIcon className="size-4 text-fg-muted flex-shrink-0" />
          <span className="flex-1 text-left">
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "PP")} – {format(value.to, "PP")}
                </>
              ) : (
                format(value.from, "PP")
              )
            ) : (
              placeholder
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={(range) => onChange?.(range)}
          required={false}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
