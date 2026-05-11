import { cn } from "@/lib/utils";
import type { Product } from "@/lib/mock-data";

type Size = "sm" | "md" | "lg" | "xl";

interface ProductVisualProps {
  product: Pick<Product, "bg" | "fg" | "mark" | "brand">;
  size?: Size;
  badge?: string;
  className?: string;
}

const dims: Record<Size, { label: number; mark: number; aspect: string }> = {
  sm: { label: 11, mark: 18, aspect: "aspect-square" },
  md: { label: 13, mark: 36, aspect: "aspect-square" },
  lg: { label: 14, mark: 48, aspect: "aspect-square" },
  xl: { label: 16, mark: 64, aspect: "aspect-[4/5]" },
};

/**
 * Tasteful product placeholder — gradient background with brand mark.
 * Per CLAUDE.md: no fake imagery in the prototype.
 */
export function ProductVisual({ product, size = "md", badge, className }: ProductVisualProps) {
  const d = dims[size];
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md flex flex-col justify-between p-3",
        d.aspect,
        className,
      )}
      style={{
        background: product.bg,
        color: product.fg ?? "rgba(255,255,255,.95)",
      }}
    >
      <div className="flex items-start justify-between">
        <span
          className="font-semibold uppercase tracking-wider opacity-85"
          style={{ fontSize: d.label }}
        >
          {product.brand}
        </span>
        {badge && (
          <span className="rounded-full bg-white/22 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      <div
        className="font-bold leading-none tracking-tight"
        style={{ fontSize: d.mark, fontFamily: "var(--font-display)" }}
      >
        {product.mark}
      </div>
    </div>
  );
}
