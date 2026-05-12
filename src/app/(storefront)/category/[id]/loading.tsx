import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/storefront/product-grid-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-6 pt-6 pb-12">
      <Skeleton className="h-3 w-32 mb-4" />
      <Skeleton className="h-10 w-64 mb-2" />
      <Skeleton className="h-4 w-48 mb-8" />
      <div className="grid lg:grid-cols-[240px_1fr] gap-8 lg:gap-10">
        <div className="hidden lg:flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
