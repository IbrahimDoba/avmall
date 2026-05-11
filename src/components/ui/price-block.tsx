import { Money } from "@/components/ui/money";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

interface PriceBlockProps {
  /** Current price (or sale price when onSale). */
  priceKobo: number;
  /** Original price — drawn struck-through when present. */
  comparePriceKobo?: number;
  /** Marks the price as a sale (colors price red). */
  onSale?: boolean;
  /** Display "From ₦X" for products with cheaper variants. */
  from?: boolean;
  /** Size preset. */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: { primary: "text-sm", strike: "text-xs", save: "text-[10px] px-1.5 py-0.5" },
  md: { primary: "text-lg", strike: "text-sm", save: "text-[11px] px-2 py-0.5" },
  lg: { primary: "text-2xl", strike: "text-base", save: "text-xs px-2 py-0.5" },
  xl: { primary: "text-[40px] tracking-tight", strike: "text-xl", save: "text-xs px-2.5 py-1" },
} as const;

/**
 * Standardised price display covering the 6 product price states from spec §14:
 * regular · sale · struck-original · save chip · "From ₦X" · negotiate (caller adds).
 */
export function PriceBlock({
  priceKobo,
  comparePriceKobo,
  onSale,
  from,
  size = "md",
  className,
}: PriceBlockProps) {
  const s = sizes[size];
  const savings = comparePriceKobo != null ? comparePriceKobo - priceKobo : 0;

  return (
    <div className={cn("flex items-baseline gap-2 flex-wrap", className)}>
      {from && (
        <span className="text-xs font-medium text-fg-muted">From</span>
      )}
      <Money
        kobo={priceKobo}
        className={cn(
          "font-bold tabular",
          s.primary,
          onSale && "text-danger",
        )}
      />
      {comparePriceKobo != null && (
        <Money
          kobo={comparePriceKobo}
          variant="strikethrough"
          className={s.strike}
        />
      )}
      {onSale && savings > 0 && (
        <span
          className={cn(
            "inline-flex items-center font-bold tracking-wider rounded bg-danger/10 text-danger",
            s.save,
          )}
        >
          Save {formatMoney(savings)}
        </span>
      )}
    </div>
  );
}
