import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { CATEGORIES, PRODUCTS, getCategory, getProductsByCategory, type ProductCategoryId } from "@/lib/mock-data";
import { CategoryFilters } from "./filters";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ id: c.id }));
}

interface CategoryPageProps {
  params: { id: string };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const category = getCategory(params.id);
  if (!category) notFound();

  let products = getProductsByCategory(params.id as ProductCategoryId);
  // Pad with other products if too few — keeps the prototype lively
  if (products.length < 6) {
    products = [...products, ...PRODUCTS.filter((p) => !products.includes(p)).slice(0, 6 - products.length)];
  }

  return (
    <div className="pb-6">
      {/* Breadcrumb */}
      <div className="px-4 pt-3 flex items-center gap-1.5 text-xs text-fg-muted">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-fg font-medium">{category.name}</span>
      </div>

      <div className="px-4 pt-2 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
        <div className="text-xs text-fg-muted mt-0.5">{products.length} products</div>
      </div>

      <CategoryFilters />

      <div className="grid grid-cols-2 gap-3.5 px-4 pt-3">
        {products.map((p, i) => (
          <ProductCard key={p.id + i} product={p} />
        ))}
      </div>
    </div>
  );
}
