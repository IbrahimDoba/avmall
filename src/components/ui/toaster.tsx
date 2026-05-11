"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-surface text-fg border border-border shadow-lg rounded-md",
          description: "text-fg-muted",
          actionButton: "bg-brand-primary text-brand-primary-fg",
          cancelButton: "bg-surface-2 text-fg-muted",
          success: "border-success/30",
          error: "border-danger/30",
          warning: "border-warning/30",
          info: "border-info/30",
        },
      }}
    />
  );
}

export { toast } from "sonner";
