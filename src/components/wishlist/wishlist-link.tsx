"use client";

import Link from "next/link";
import { useWishlistStore } from "@/store/wishlist-store";
import { useWishlistHydration } from "@/components/wishlist/use-wishlist-hydration";

export function WishlistLink({ className }: { className?: string }) {
  const hydrated = useWishlistHydration();
  const count = useWishlistStore((state) => state.totalWishlistItems());

  return (
    <Link href="/wishlist" className={className} aria-label={hydrated ? `Wishlist, ${count} saved ${count === 1 ? "product" : "products"}` : "Wishlist"}>
      Wishlist{hydrated ? ` (${count})` : ""}
    </Link>
  );
}
