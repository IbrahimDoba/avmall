import { SettingsClient } from "./settings-client";
import { Truck, Shield, User } from "lucide-react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AdminTopBar } from "@/components/admin/topbar";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { icon: Truck, label: "Shipping zones", desc: "Per-state rates, free-shipping thresholds", href: "/admin/shipping" },
  { icon: Shield, label: "Staff & roles", desc: "Invite staff, change roles, disable users", href: "/admin/staff" },
  { icon: User, label: "Your profile", desc: "Display name, change password", href: "/admin/profile" },
];

export default function AdminSettingsPage() {
  return (
    <>
      <AdminTopBar breadcrumbs={[{ label: "Settings" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[900px] mx-auto pb-16">
          <PageHeader
            title="Settings"
            subtitle="Business profile, bank account, return policy"
          />

          <SettingsClient />

          <h2 className="text-[11px] font-bold uppercase tracking-widest text-fg-muted mt-10 mb-3">
            Other settings
          </h2>
          <div className="flex flex-col gap-2">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface hover:border-border-strong transition-colors"
                >
                  <div className="size-9 rounded-md bg-info-bg text-brand-primary flex items-center justify-center flex-shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{item.label}</div>
                    <div className="text-xs text-fg-muted mt-0.5">{item.desc}</div>
                  </div>
                  <ChevronRight className="size-4 text-fg-muted" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
