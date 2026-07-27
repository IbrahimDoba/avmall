import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { StaffMobileNav } from "@/components/admin/staff-mobile-nav";
import { Toaster } from "@/components/ui/toaster";
import { CommandPalette } from "@/components/ui/command-palette";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { getStaffSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { permissionForPath } from "@/lib/admin-access";

// Admin is auth-gated and always reads live data — never prerender.
export const dynamic = "force-dynamic";

/**
 * Authoritative, server-side access guard for the whole /admin area. Runs on
 * every admin navigation (the layout re-renders per request under
 * force-dynamic). Middleware only proved a valid session exists; here we check
 * the session's role actually permits the requested section, redirecting to
 * /admin/no-access otherwise. This is the real RBAC enforcement — UI nav
 * hiding is only cosmetic (CLAUDE.md §2.5, §19).
 */
async function enforceAdminAccess() {
  // Dev without NEXTAUTH_SECRET means auth/DB isn't wired and middleware lets
  // everything through so the UI stays browsable — mirror that here.
  if (!process.env.NEXTAUTH_SECRET) return;

  const path = headers().get("x-admin-path") ?? "";
  const session = await getStaffSession();
  const user = session?.user;
  if (!user) redirect("/admin-login");

  const perm = permissionForPath(path);
  if (perm && !hasPermission({ role: user.role, permissions: user.permissions }, perm)) {
    redirect("/admin/no-access");
  }
}

export default async function AdminRouteGroupLayout({ children }: { children: React.ReactNode }) {
  await enforceAdminAccess();
  return (
    <div className="h-screen flex bg-bg overflow-hidden print:h-auto print:overflow-visible print:block">
      <div className="print:hidden contents">
        <AdminSidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 print:block print:flex-none">
        {children}
        {/* Bottom tab bar — mobile/tablet only, in flow so it never overlaps. */}
        <div className="print:hidden contents">
          <StaffMobileNav />
        </div>
      </div>
      <div className="print:hidden contents">
        <CommandPalette />
        <Toaster />
        {/* Staff PWA: register the service worker + offer install (mobile). */}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </div>
    </div>
  );
}
