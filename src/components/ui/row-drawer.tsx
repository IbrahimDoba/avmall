"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface RowDrawerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: React.ReactNode;
  /** Optional secondary line (status pill, timestamp). */
  meta?: React.ReactNode;
  /** Footer actions. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: number | string;
}

/**
 * Right-side drawer for opening a list row in-place without leaving the page.
 * Builds on the underlying Sheet primitive with consistent header/body/footer.
 */
export function RowDrawer({
  open,
  onOpenChange,
  title,
  meta,
  footer,
  children,
  width = 520,
}: RowDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col"
        style={{ width, maxWidth: "100vw" }}
      >
        <div className="px-5 py-4 border-b border-border flex-shrink-0">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {meta && <div className="text-xs text-fg-muted mt-1">{meta}</div>}
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 flex-shrink-0">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
