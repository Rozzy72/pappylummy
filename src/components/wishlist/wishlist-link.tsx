"use client";

import { NavLink } from "@sd/ui";
import { useWishlistStore } from "@/store/wishlist-store";
import { useWishlistHydration } from "@/components/wishlist/use-wishlist-hydration";

export function WishlistLink() {
  const hydrated = useWishlistHydration();
  const count = useWishlistStore((state) => state.totalWishlistItems());

  return (
    <NavLink
      href="/wishlist"
      aria-label={
        hydrated
          ? `Wishlist, ${count} saved ${count === 1 ? "product" : "products"}`
          : "Wishlist"
      }
    >
      Wishlist{hydrated ? ` (${count})` : ""}
    </NavLink>
  );
}
