"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-3",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-bold",
        nav: "flex items-center",
        button_previous:
          "absolute left-1 inline-flex size-7 items-center justify-center rounded-md hover:bg-surface-2",
        button_next:
          "absolute right-1 inline-flex size-7 items-center justify-center rounded-md hover:bg-surface-2",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-fg-muted rounded-md w-8 text-[10px] font-bold uppercase tracking-wider",
        week: "flex w-full mt-1.5",
        day: "size-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          "inline-flex items-center justify-center size-8 rounded-md hover:bg-surface-2",
          "aria-selected:bg-brand-primary aria-selected:text-brand-primary-fg",
          "aria-selected:hover:bg-brand-primary-hover",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ),
        range_start: "bg-brand-primary text-brand-primary-fg rounded-l-md",
        range_end: "bg-brand-primary text-brand-primary-fg rounded-r-md",
        range_middle: "bg-info-bg text-fg rounded-none",
        today: "font-bold text-brand-primary",
        outside: "text-fg-subtle opacity-50",
        disabled: "text-fg-subtle opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
