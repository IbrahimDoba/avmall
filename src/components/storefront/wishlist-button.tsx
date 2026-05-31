"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/stores/wishlist-store";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId }: { productId: string }) {
  const toggle = useWishlist((s) => s.toggle);
  const saved = useWishlist((s) => s.has(productId));

  return (
    <button
      className={cn(
        "hidden lg:flex absolute top-3 right-3 items-center justify-center size-9 rounded-full bg-white/95 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white",
        saved && "opacity-100 text-danger",
      )}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
    >
      <Heart className={cn("size-4", saved && "fill-current")} />
    </button>
  );
}
