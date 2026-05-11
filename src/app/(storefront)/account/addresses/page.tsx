import Link from "next/link";
import { ChevronRight, Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ADDRESSES = [
  {
    id: "a1",
    label: "Home",
    name: "Tolu Adeniyi",
    line1: "14 Bourdillon Road, Apt 3B",
    city: "Ikoyi, Lagos",
    phone: "+234 803 421 7790",
    primary: true,
  },
  {
    id: "a2",
    label: "Office",
    name: "Tolu Adeniyi",
    line1: "Plot 12, Idejo Street",
    city: "Victoria Island, Lagos",
    phone: "+234 803 421 7790",
  },
];

export default function AddressesPage() {
  return (
    <div className="px-4 py-4 pb-6">
      <div className="flex items-center gap-1.5 text-xs text-fg-muted mb-2">
        <Link href="/account" className="hover:text-fg">
          Account
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-fg font-medium">Addresses</span>
      </div>
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Addresses</h1>
        <Button size="sm" variant="secondary">
          <Plus className="size-3.5" /> Add
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {ADDRESSES.map((a) => (
          <div key={a.id} className="p-4 rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="size-3.5 text-fg-muted" />
              <span className="font-semibold text-sm">{a.label}</span>
              {a.primary && <Badge tone="brand">Default</Badge>}
            </div>
            <div className="text-sm space-y-0.5">
              <div className="font-semibold">{a.name}</div>
              <div className="text-fg-muted">{a.line1}</div>
              <div className="text-fg-muted">{a.city}</div>
              <div className="text-fg-muted font-mono text-xs tabular">{a.phone}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="ghost">
                Edit
              </Button>
              {!a.primary && (
                <Button size="sm" variant="ghost">
                  Make default
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
