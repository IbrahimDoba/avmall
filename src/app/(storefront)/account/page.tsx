import Link from "next/link";
import { ChevronRight, Package, MapPin, User, LogOut } from "lucide-react";

const ITEMS = [
  { icon: Package, label: "Orders", href: "/account/orders", sub: "Track and return" },
  { icon: MapPin, label: "Addresses", href: "/account/addresses", sub: "Delivery destinations" },
  { icon: User, label: "Profile", href: "/account/profile", sub: "Name, phone, email" },
];

export default function AccountPage() {
  return (
    <div className="px-4 py-4 pb-6">
      <h1 className="text-2xl font-bold tracking-tight">My account</h1>
      <p className="text-sm text-fg-muted mt-1">Hi, Tolu</p>

      <div className="mt-5 flex flex-col gap-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface hover:border-border-strong"
            >
              <div className="size-10 rounded-md bg-info-bg text-brand-primary flex items-center justify-center">
                <Icon className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{item.label}</div>
                <div className="text-xs text-fg-muted mt-0.5">{item.sub}</div>
              </div>
              <ChevronRight className="size-4 text-fg-muted" />
            </Link>
          );
        })}
        <button className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface hover:border-border-strong text-left">
          <div className="size-10 rounded-md bg-danger-bg text-danger flex items-center justify-center">
            <LogOut className="size-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-danger">Sign out</div>
          </div>
        </button>
      </div>
    </div>
  );
}
