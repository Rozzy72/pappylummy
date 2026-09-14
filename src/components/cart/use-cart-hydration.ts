"use client";

import { useEffect } from "react";
import { hydrateCart, useCartStore } from "@/store/cart-store";

export function useCartHydration(): boolean {
  const hydrated = useCartStore((state) => state.hydrated);
  useEffect(() => { void hydrateCart(); }, []);
  return hydrated;
}
