"use client";

import Link from "next/link";
import { selectTotalItems, useCartStore } from "@/store/cart-store";
import { useCartHydration } from "@/components/cart/use-cart-hydration";

export function CartLink({ className }: { className?: string }) {
  const hydrated = useCartHydration();
  const count = useCartStore(selectTotalItems);
  return (
    <Link href="/cart" className={className} aria-label={hydrated ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart"}>
      Cart{hydrated ? ` (${count})` : ""}
    </Link>
  );
}
