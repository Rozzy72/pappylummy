"use client";

import { useEffect } from "react";
import { hydrateWishlist, useWishlistStore } from "@/store/wishlist-store";

export function useWishlistHydration(): boolean {
  const hydrated = useWishlistStore((state) => state.hydrated);
  useEffect(() => { void hydrateWishlist(); }, []);
  return hydrated;
}
