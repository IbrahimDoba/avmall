import { AdminSidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { CommandPalette } from "@/components/ui/command-palette";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AdminRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen flex bg-bg overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">{children}</div>
        <CommandPalette />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
