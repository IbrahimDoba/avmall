import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 lg:py-10">
      <Skeleton className="h-3 w-64 mb-5" />
      <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-14">
        <div className="flex flex-col lg:flex-row-reverse gap-3 lg:gap-4">
          <Skeleton className="w-full aspect-square max-h-[560px] rounded-xl" />
          <div className="flex lg:flex-col gap-2 lg:w-20 flex-shrink-0">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="size-16 lg:size-20 rounded-md" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-12 w-48 mt-6" />
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-11 w-20" />
            <Skeleton className="h-11 w-20" />
            <Skeleton className="h-11 w-20" />
          </div>
          <Skeleton className="h-14 w-full mt-6" />
        </div>
      </div>
    </div>
  );
}
