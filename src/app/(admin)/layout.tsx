import { AdminSidebar } from "@/components/admin/sidebar";
import { StaffMobileNav } from "@/components/admin/staff-mobile-nav";
import { Toaster } from "@/components/ui/toaster";
import { CommandPalette } from "@/components/ui/command-palette";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";

// Admin is auth-gated and always reads live data — never prerender.
export const dynamic = "force-dynamic";

export default function AdminRouteGroupLayout({ children }: { children: React.ReactNode }) {
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
