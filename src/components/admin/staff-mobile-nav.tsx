"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShoppingBag, Plus, ScanLine, Package, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { permissionForPath } from "@/lib/admin-access";

const TABS = [
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/orders/new", label: "New", icon: Plus },
  { href: "/admin/pos", label: "Register", icon: ScanLine },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/returns", label: "Returns", icon: Archive },
] as const;

/** Bottom tab bar for the staff PWA. Shown below the lg breakpoint (where the
 *  desktop sidebar is hidden). Rendered in normal flow at the bottom of the
 *  admin shell so it never overlaps scrolling content. */
export function StaffMobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const perms = session?.user?.permissions;

  // Only surface tabs the role can open (mirrors the server guard). While the
  // session loads (perms undefined) show all — the server guard is the real gate.
  const tabs = TABS.filter((t) => {
    const required = permissionForPath(t.href);
    return !required || !perms || perms.includes(required);
  });

  // Longest-prefix match so /admin/orders/new lights up "New", not "Orders".
  const activeHref = tabs.reduce<string | null>((best, t) => {
    const match = pathname === t.href || pathname.startsWith(`${t.href}/`);
    if (match && t.href.length > (best?.length ?? 0)) return t.href;
    return best;
  }, null);

  if (tabs.length === 0) return null;

  return (
    <nav
      className="lg:hidden flex-shrink-0 border-t border-border bg-surface flex pb-[env(safe-area-inset-bottom)]"
      aria-label="Staff navigation"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = activeHref === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.5rem] text-[10px] font-semibold transition-colors",
              active ? "text-brand-primary" : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon className={cn("size-5", active && "stroke-[2.5]")} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
