"use client";

import Link from "next/link";
import { ShoppingBag, Search, Menu } from "lucide-react";
import { useCart } from "@/stores/cart-store";

export function TopNav() {
  const lines = useCart((s) => s.lines);
  const count = lines.reduce((a, l) => a + l.qty, 0);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="flex items-center gap-2 px-4 h-14">
        <button
          className="flex items-center justify-center size-9 rounded-md hover:bg-surface-2 text-fg"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/" className="flex items-center gap-1.5 font-bold text-lg tracking-tight">
          <span className="inline-flex items-center justify-center size-6 rounded-md bg-brand-primary text-brand-primary-fg text-xs font-bold">
            av
          </span>
          <span>mall</span>
        </Link>
        <div className="flex-1" />
        <button
          className="flex items-center justify-center size-9 rounded-md hover:bg-surface-2 text-fg"
          aria-label="Search"
        >
          <Search className="size-5" />
        </button>
        <Link
          href="/cart"
          className="relative flex items-center justify-center size-9 rounded-md hover:bg-surface-2 text-fg"
          aria-label={`Cart with ${count} items`}
        >
          <ShoppingBag className="size-5" />
          {count > 0 && (
            <span
              className="absolute top-0 right-0 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-brand-primary text-brand-primary-fg text-[10px] font-bold tabular"
              aria-hidden
            >
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
