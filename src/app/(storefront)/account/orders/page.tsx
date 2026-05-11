import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Money } from "@/components/ui/money";
import { OrderStatusPill, type OrderStatus } from "@/components/ui/status-pill";

const ORDERS: {
  number: string;
  date: string;
  totalKobo: number;
  status: OrderStatus;
  items: number;
}[] = [
  { number: "AVM-2841", date: "Tue 14 Jan", totalKobo: 6294000, status: "confirmed", items: 3 },
  { number: "AVM-2811", date: "8 Jan", totalKobo: 18900000, status: "delivered", items: 6 },
  { number: "AVM-2790", date: "2 Jan", totalKobo: 8400000, status: "delivered", items: 2 },
  { number: "AVM-2754", date: "24 Dec", totalKobo: 14200000, status: "refunded", items: 4 },
];

export default function AccountOrdersPage() {
  return (
    <div className="px-4 py-4 pb-6">
      <div className="flex items-center gap-1.5 text-xs text-fg-muted mb-2">
        <Link href="/account" className="hover:text-fg">
          Account
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-fg font-medium">Orders</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      <p className="text-sm text-fg-muted mt-0.5">{ORDERS.length} orders</p>

      <div className="mt-5 flex flex-col gap-2.5">
        {ORDERS.map((o) => (
          <Link
            key={o.number}
            href={`/orders/${o.number}`}
            className="block p-4 rounded-lg border border-border bg-surface hover:border-border-strong"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-bold text-sm tabular">#{o.number}</span>
              <OrderStatusPill status={o.status} />
            </div>
            <div className="text-xs text-fg-muted mb-2">
              {o.date} · {o.items} items
            </div>
            <div className="flex items-center justify-between">
              <Money kobo={o.totalKobo} className="font-bold text-sm" />
              <span className="text-xs text-brand-primary font-semibold">Track →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
