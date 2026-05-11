"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import {
  Search,
  Package,
  Users,
  Archive,
  ShoppingBag,
  LayoutDashboard,
  Flag,
  Truck,
  Sparkles,
  Settings,
  BarChart3,
  Plus,
  Shield,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  icon: typeof LayoutDashboard;
  href?: string;
  onAction?: () => void;
  group: string;
}

const ACTIONS: CommandAction[] = [
  { id: "go-dashboard", label: "Go to dashboard", icon: LayoutDashboard, href: "/admin", group: "Navigate" },
  { id: "go-orders", label: "Go to orders", icon: ShoppingBag, href: "/admin/orders", group: "Navigate" },
  { id: "go-products", label: "Go to products", icon: Package, href: "/admin/products", group: "Navigate" },
  { id: "go-customers", label: "Go to customers", icon: Users, href: "/admin/customers", group: "Navigate" },
  { id: "go-returns", label: "Go to returns", icon: Archive, href: "/admin/returns", group: "Navigate" },
  { id: "go-discounts", label: "Go to discounts", icon: Flag, href: "/admin/discounts", group: "Navigate" },
  { id: "go-shipping", label: "Go to shipping", icon: Truck, href: "/admin/shipping", group: "Navigate" },
  { id: "go-reports", label: "Go to reports", icon: BarChart3, href: "/admin/reports", group: "Navigate" },
  { id: "go-ai", label: "Go to AI agent", icon: Sparkles, href: "/admin/ai", group: "Navigate" },
  { id: "go-staff", label: "Go to staff & roles", icon: Shield, href: "/admin/staff", group: "Navigate" },
  { id: "go-settings", label: "Go to settings", icon: Settings, href: "/admin/settings", group: "Navigate" },
  { id: "new-order", label: "Create new order", icon: Plus, href: "/admin/orders/new", group: "Actions", shortcut: "N O" },
  { id: "new-product", label: "Add a product", icon: Plus, href: "/admin/products", group: "Actions" },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function trigger(a: CommandAction) {
    setOpen(false);
    if (a.href) router.push(a.href);
    a.onAction?.();
  }

  const grouped = React.useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    for (const a of ACTIONS) {
      const list = map.get(a.group) ?? [];
      list.push(a);
      map.set(a.group, list);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <CommandPrimitive className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 text-fg-muted" />
            <CommandPrimitive.Input
              placeholder="Search commands, navigate, or type an order #…"
              className="flex h-12 w-full bg-transparent text-sm placeholder:text-fg-subtle outline-none"
            />
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-surface-2 border border-border rounded">
              ESC
            </kbd>
          </div>
          <CommandPrimitive.List className="max-h-96 overflow-y-auto p-2">
            <CommandPrimitive.Empty className="py-8 text-center text-xs text-fg-muted">
              No results.
            </CommandPrimitive.Empty>
            {grouped.map(([group, items]) => (
              <CommandPrimitive.Group
                key={group}
                heading={group}
                className={cn(
                  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5",
                  "[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold",
                  "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider",
                  "[&_[cmdk-group-heading]]:text-fg-muted",
                )}
              >
                {items.map((a) => {
                  const Icon = a.icon;
                  return (
                    <CommandPrimitive.Item
                      key={a.id}
                      value={a.label}
                      onSelect={() => trigger(a)}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-sm cursor-pointer text-sm data-[selected=true]:bg-surface-2"
                    >
                      <Icon className="size-4 text-fg-muted" />
                      <span className="flex-1">{a.label}</span>
                      {a.shortcut && (
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-surface-2 border border-border rounded">
                          {a.shortcut}
                        </kbd>
                      )}
                    </CommandPrimitive.Item>
                  );
                })}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>
          <div className="border-t border-border px-3 py-2 text-[10px] text-fg-muted flex items-center justify-between">
            <span>
              <kbd className="font-mono">↑↓</kbd> navigate ·{" "}
              <kbd className="font-mono">↵</kbd> select ·{" "}
              <kbd className="font-mono">ESC</kbd> close
            </span>
            <span>
              Open anytime with <kbd className="font-mono px-1.5 py-0.5 bg-surface-2 border border-border rounded">⌘K</kbd>
            </span>
          </div>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
