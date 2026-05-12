import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridSkeletonProps {
  count?: number;
  cols?: "2" | "3" | "4";
}

export function ProductGridSkeleton({ count = 8, cols = "4" }: ProductGridSkeletonProps) {
  const colClass =
    cols === "2"
      ? "grid-cols-2"
      : cols === "3"
        ? "grid-cols-2 lg:grid-cols-3"
        : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={`grid ${colClass} gap-5 lg:gap-6`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="w-full aspect-square rounded-lg" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
