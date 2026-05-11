import Image from "next/image";
import { Money } from "@/components/ui/money";
import { formatMoney } from "@/lib/money";

interface ReceiptItem {
  name: string;
  variant: string;
  sku: string;
  qty: number;
  unitKobo: number;
  discountKobo: number;
  imageUrl?: string;
}

interface ReceiptPrintViewProps {
  orderNumber: string;
  placedAt: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
  };
  items: ReceiptItem[];
  totals: {
    subtotalKobo: number;
    discountKobo: number;
    shippingKobo: number;
    totalKobo: number;
    paidKobo: number;
    outstandingKobo: number;
  };
  notes?: string;
}

/**
 * Print-optimised order receipt. Use with `window.print()` and a print stylesheet —
 * the layout is plain, monochrome-friendly, and uses A4-safe dimensions.
 */
export function ReceiptPrintView({
  orderNumber,
  placedAt,
  customer,
  shippingAddress,
  items,
  totals,
  notes,
}: ReceiptPrintViewProps) {
  return (
    <div className="bg-white text-fg p-8 max-w-[210mm] mx-auto font-sans text-sm leading-relaxed print:p-12 print:max-w-none print:shadow-none">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b border-border-strong">
        <div>
          <div className="flex items-center gap-2 font-bold text-xl mb-3">
            <span className="inline-flex items-center justify-center size-8 rounded-md bg-brand-primary text-brand-primary-fg text-sm font-extrabold">
              av
            </span>
            mall
          </div>
          <div className="text-xs text-fg-muted">Avmall Ltd · RC 1842901</div>
          <div className="text-xs text-fg-muted">Lagos, Nigeria</div>
          <div className="text-xs text-fg-muted">hello@avmall.ng · +234 805 000 0000</div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Receipt</h1>
          <div className="font-mono font-bold text-base tabular">#{orderNumber}</div>
          <div className="text-xs text-fg-muted">{placedAt}</div>
        </div>
      </div>

      {/* Bill to / Ship to */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-1.5">
            Customer
          </div>
          <div className="font-bold">{customer.name}</div>
          <div className="text-xs">{customer.phone}</div>
          {customer.email && <div className="text-xs">{customer.email}</div>}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-1.5">
            Ship to
          </div>
          <div className="font-bold">{customer.name}</div>
          <div className="text-xs">{shippingAddress.line1}</div>
          {shippingAddress.line2 && <div className="text-xs">{shippingAddress.line2}</div>}
          <div className="text-xs">
            {shippingAddress.city}, {shippingAddress.state}
          </div>
        </div>
      </div>

      {/* Items */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-fg-muted border-b-2 border-border-strong">
            <th className="text-left py-2">Item</th>
            <th className="text-right py-2 px-2">Qty</th>
            <th className="text-right py-2 px-2">Unit</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-b border-border">
              <td className="py-2.5 align-top">
                <div className="flex items-center gap-2.5">
                  {it.imageUrl && (
                    <div className="relative size-10 rounded-sm overflow-hidden bg-surface-2 flex-shrink-0 print:hidden">
                      <Image src={it.imageUrl} alt={it.name} fill sizes="40px" className="object-cover" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-[11px] text-fg-muted">
                      {it.variant} · <span className="font-mono tabular">{it.sku}</span>
                    </div>
                    {it.discountKobo > 0 && (
                      <div className="text-[11px] text-brand-accent">
                        −{formatMoney(it.discountKobo)} bulk discount
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="text-right tabular align-top px-2 py-2.5">{it.qty}</td>
              <td className="text-right align-top px-2 py-2.5">
                <Money kobo={it.unitKobo} />
              </td>
              <td className="text-right font-semibold align-top py-2.5">
                <Money kobo={it.unitKobo * it.qty - it.discountKobo} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="min-w-[280px] space-y-1">
          <Row label="Subtotal" value={formatMoney(totals.subtotalKobo)} />
          {totals.discountKobo > 0 && (
            <Row label="Discounts" value={`−${formatMoney(totals.discountKobo)}`} />
          )}
          <Row
            label="Shipping"
            value={totals.shippingKobo === 0 ? "Free" : formatMoney(totals.shippingKobo)}
          />
          <div className="h-px bg-border-strong my-2" />
          <Row label="Total" value={formatMoney(totals.totalKobo)} strong />
          <Row label="Paid" value={formatMoney(totals.paidKobo)} muted />
          {totals.outstandingKobo > 0 && (
            <Row
              label="Outstanding"
              value={formatMoney(totals.outstandingKobo)}
              strong
              tone="warning"
            />
          )}
        </div>
      </div>

      {notes && (
        <div className="mt-6 p-3.5 border border-border-strong rounded text-xs">
          <div className="font-bold mb-1">Notes</div>
          <div className="text-fg-muted">{notes}</div>
        </div>
      )}

      <div className="mt-10 pt-4 border-t border-border-strong text-center text-[10px] text-fg-muted">
        Thank you for shopping with Avmall · Returns within 14 days · Reach us on WhatsApp +234 805 000 0000
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  tone?: "warning";
}) {
  return (
    <div
      className="flex justify-between"
      style={tone === "warning" ? { color: "hsl(var(--warning))" } : undefined}
    >
      <span
        className={
          strong ? "font-bold" : muted ? "text-fg-subtle" : "text-fg-muted"
        }
      >
        {label}
      </span>
      <span className={`tabular ${strong ? "font-bold text-base" : "font-semibold"}`}>
        {value}
      </span>
    </div>
  );
}
