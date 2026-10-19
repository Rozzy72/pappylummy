"use client";

import { NavLink, StoreIconLink } from "@sd/ui";
import { selectTotalItems, useCartStore } from "@/store/cart-store";
import { useCartHydration } from "@/components/cart/use-cart-hydration";

export function CartLink({icon=false}:{icon?:boolean}={}) {
  const hydrated = useCartHydration();
  const count = useCartStore(selectTotalItems);
  if(icon)return <StoreIconLink href="/cart" icon="bag" label={hydrated?`Cart, ${count} ${count===1?"item":"items"}`:"Cart"} count={hydrated?count:undefined}/>;
  return (
    <NavLink
      href="/cart"
      aria-label={
        hydrated ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart"
      }
    >
      Cart{hydrated ? ` (${count})` : ""}
    </NavLink>
  );
}
