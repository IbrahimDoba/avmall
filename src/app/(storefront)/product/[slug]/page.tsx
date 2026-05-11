import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { PRODUCTS, getProduct } from "@/lib/mock-data";
import { ProductVisual } from "@/components/ui/product-visual";
import { PDPDetail } from "./detail";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

interface PDPProps {
  params: { slug: string };
}

export default function PDPPage({ params }: PDPProps) {
  const product = getProduct(params.slug);
  if (!product) notFound();

  return (
    <div className="pb-32">
      {/* Breadcrumb */}
      <div className="px-4 pt-3 flex items-center gap-1.5 text-xs text-fg-muted">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <ChevronRight className="size-3" />
        <Link href={`/category/${product.category}`} className="hover:text-fg capitalize">
          {product.category}
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-fg font-medium truncate">{product.name}</span>
      </div>

      {/* Gallery */}
      <div className="px-4 pt-3">
        <ProductVisual product={product} size="xl" />
        <div className="flex gap-2 mt-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="size-14 flex-shrink-0 rounded-sm"
              style={{
                background: product.bg,
                opacity: i === 0 ? 1 : 0.35,
                border: i === 0 ? "2px solid hsl(var(--brand-primary))" : "1px solid hsl(var(--border))",
              }}
            />
          ))}
        </div>
      </div>

      <div className="px-4">
        <div className="text-[11px] font-bold uppercase tracking-widest text-fg-muted mt-4">
          {product.brand}
        </div>
        <h1 className="text-2xl font-bold tracking-tight leading-tight mt-1.5 mb-1">{product.name}</h1>
        <p className="text-sm text-fg-muted leading-relaxed mb-3">{product.short}</p>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex gap-px text-warning">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="size-3.5 fill-current" strokeWidth={0} />
            ))}
          </div>
          <span className="text-[13px] font-semibold">{product.rating}</span>
          <span className="text-xs text-fg-muted">({product.reviews})</span>
        </div>

        <PDPDetail product={product} />
      </div>
    </div>
  );
}
