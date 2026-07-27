/**
 * Admin route → required view-permission map.
 *
 * Middleware only proves a visitor is logged in — it does NOT check role. This
 * map is the single source of truth for "what permission does it take to open
 * this admin path", enforced server-side in the admin layout and mirrored by
 * the sidebar/mobile-nav so what a staff member can SEE and what they can OPEN
 * never drift apart (CLAUDE.md §2.5, §19).
 *
 * Pure/client-safe: no server-only imports, so client nav components can import
 * `permissionForPath` too.
 *
 * First match wins, so more specific paths are listed before their prefixes.
 * A path that matches nothing needs only a valid staff session (e.g. profile,
 * no-access).
 */

import type { PermissionKey } from "@/lib/permissions";

const RULES: { test: (p: string) => boolean; perm: PermissionKey }[] = [
  { test: (p) => p === "/admin", perm: "reports.view" },
  { test: (p) => p === "/admin/pos", perm: "orders.create" },
  { test: (p) => p === "/admin/orders/new", perm: "orders.create" },
  { test: (p) => p.startsWith("/admin/orders"), perm: "orders.view" },
  { test: (p) => p === "/admin/products/new", perm: "products.create" },
  { test: (p) => p.startsWith("/admin/products"), perm: "products.view" },
  { test: (p) => p.startsWith("/admin/categories"), perm: "products.view" },
  { test: (p) => p.startsWith("/admin/customers"), perm: "customers.view" },
  { test: (p) => p === "/admin/returns/new", perm: "returns.create" },
  { test: (p) => p.startsWith("/admin/returns"), perm: "returns.view" },
  { test: (p) => p === "/admin/discounts/new", perm: "discounts.create" },
  { test: (p) => /^\/admin\/discounts\/[^/]+\/edit/.test(p), perm: "discounts.edit" },
  { test: (p) => p.startsWith("/admin/discounts"), perm: "discounts.view" },
  { test: (p) => p === "/admin/shipping/new", perm: "shipping.edit" },
  { test: (p) => p.startsWith("/admin/shipping"), perm: "shipping.view" },
  { test: (p) => p.startsWith("/admin/reports"), perm: "reports.view" },
  { test: (p) => p.startsWith("/admin/expenses"), perm: "expenses.view" },
  // /admin/ai renders the Profit Analysis dashboard (revenue + profit).
  { test: (p) => p.startsWith("/admin/ai"), perm: "reports.view" },
  { test: (p) => p.startsWith("/admin/staff-analysis"), perm: "reports.view" },
  { test: (p) => p.startsWith("/admin/staff"), perm: "staff.view" },
  { test: (p) => p.startsWith("/admin/stores"), perm: "stores.view" },
  { test: (p) => p.startsWith("/admin/settings"), perm: "settings.view" },
  // Content list + journal list are viewable with settings.view; the editors
  // (create/edit) require settings.edit, matching the content API routes.
  { test: (p) => p === "/admin/content" || p === "/admin/content/journal", perm: "settings.view" },
  { test: (p) => p.startsWith("/admin/content"), perm: "settings.edit" },
];

/**
 * The permission required to view `path`, or `null` when only a valid staff
 * session is needed (profile, no-access, or any unmapped path).
 */
export function permissionForPath(path: string): PermissionKey | null {
  const clean = (path.split("?")[0] ?? "").replace(/\/+$/, "") || "/admin";
  for (const r of RULES) if (r.test(clean)) return r.perm;
  return null;
}
