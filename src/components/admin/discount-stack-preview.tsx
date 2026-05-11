import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

export interface DiscountStackLayer {
  label: string;
  /** Discount amount applied at this layer (positive kobo, will be shown as -). */
  amountKobo: number;
  /** Where the discount comes from. */
  kind: "bulk" | "sale" | "coupon" | "manual" | "shipping";
  /** Human note ("8% off · 6+ units"). */
  note?: string;
}

interface DiscountStackPreviewProps {
  /** Starting amount before any discount. */
  subtotalKobo: number;
  /** Applied layers in priority order (per CLAUDE.md Appendix B). */
  layers: DiscountStackLayer[];
  className?: string;
}

const KIND_LABEL: Record<DiscountStackLayer["kind"], string> = {
  bulk: "Bulk tier",
  sale: "Sale price",
  coupon: "Coupon",
  manual: "Manual",
  shipping: "Shipping",
};

const KIND_TONE: Record<DiscountStackLayer["kind"], string> = {
  bulk: "text-brand-accent",
  sale: "text-status-shipped",
  coupon: "text-status-processing",
  manual: "text-warning",
  shipping: "text-info",
};

/**
 * Visualises how multiple discounts stack against an order subtotal. Layers
 * are applied in the order they appear, following CLAUDE.md Appendix B.
 */
export function DiscountStackPreview({
  subtotalKobo,
  layers,
  className,
}: DiscountStackPreviewProps) {
  let running = subtotalKobo;

  return (
    <div className={cn("rounded-md border border-border bg-surface", className)}>
      <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
          Subtotal
        </span>
        <Money kobo={subtotalKobo} className="font-bold" />
      </div>
      <ol className="px-3.5 py-2.5 space-y-2">
        {layers.map((l, i) => {
          running -= l.amountKobo;
          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="flex items-center justify-center size-5 rounded-full bg-surface-2 text-[10px] font-bold tabular flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("text-xs font-bold uppercase tracking-wider", KIND_TONE[l.kind])}>
                    {KIND_LABEL[l.kind]}
                  </span>
                  <span className="font-semibold text-brand-accent tabular">
                    −<Money kobo={l.amountKobo} className="text-brand-accent" />
                  </span>
                </div>
                <div className="text-xs text-fg">{l.label}</div>
                {l.note && (
                  <div className="text-[11px] text-fg-muted mt-0.5">{l.note}</div>
                )}
                <div className="text-[10px] text-fg-subtle mt-0.5">
                  Running total: <Money kobo={running} className="font-mono text-fg-subtle" />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="px-3.5 py-3 border-t border-border bg-surface-2 flex items-center justify-between">
        <span className="text-sm font-bold">Final</span>
        <Money kobo={running} className="font-bold text-lg" />
      </div>
    </div>
  );
}
