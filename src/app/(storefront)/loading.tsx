import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/storefront/product-grid-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-6 pt-6 lg:pt-10 pb-12">
      <Skeleton className="w-full h-[420px] lg:h-[480px] rounded-xl mb-10" />
      <Skeleton className="h-8 w-48 mb-6" />
      <ProductGridSkeleton count={4} cols="4" />
    </div>
  );
}
