import Link from "next/link";
import { Tag } from "lucide-react";
import { Money } from "@/components/ui/money";
import { ProductVisual } from "@/components/ui/product-visual";
import type { Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const onSale = product.saleActive && product.sale != null;
  const oos = product.stock === 0 && !product.preorder;
  const lowStock = product.stock > 0 && product.stock < 10;
  const displayKobo = onSale ? product.sale! : product.price;

  return (
    <Link href={`/product/${product.slug}`} className={cn("block group", className)}>
      <div className="relative">
        <ProductVisual product={product} size="md" />
        {onSale && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-danger text-white rounded">
            Save {Math.round((1 - product.sale! / product.price) * 100)}%
          </span>
        )}
        {product.preorder && (
          <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-status-processing text-white rounded">
            Pre-order
          </span>
        )}
        {oos && (
          <div className="absolute inset-0 rounded-md bg-fg/45 flex items-center justify-center text-white font-semibold text-sm">
            Out of stock
          </div>
        )}
      </div>
      <div className="pt-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
          {product.brand}
        </div>
        <div className="text-sm font-semibold leading-snug mt-0.5 line-clamp-2 min-h-[34px]">
          {product.name}
        </div>
        <div className="flex items-baseline gap-1.5 mt-1">
          {onSale && (
            <Money kobo={product.price} variant="strikethrough" className="text-[11px]" />
          )}
          <Money
            kobo={displayKobo}
            className={cn("text-sm font-bold", onSale && "text-danger")}
          />
        </div>
        {product.bulk.length > 0 && (
          <div className="text-[10px] font-semibold text-brand-accent mt-1 flex items-center gap-1">
            <Tag className="size-2.5" /> Bulk discount available
          </div>
        )}
        {lowStock && !product.preorder && (
          <div className="text-[10px] font-semibold text-warning mt-1">
            Only {product.stock} left
          </div>
        )}
      </div>
    </Link>
  );
}
