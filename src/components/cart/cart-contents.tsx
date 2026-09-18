"use client";

import Link from "next/link";
import { CartLine } from "@/components/cart/cart-line";
import { useCartHydration } from "@/components/cart/use-cart-hydration";
import { selectTotalItems, useCartStore } from "@/store/cart-store";
import { formatCurrency } from "@/utils/format-currency";

import type { Product } from "@/types/product";
import { selectCart, availableSubtotal } from "@/lib/products/selection";
import { CatalogueRetry } from "@/components/product/catalogue-retry";

export function CartContents({ products }: { products: Product[] | null }) {
  const hydrated = useCartHydration();
  const items = useCartStore((state) => state.items);
  const totalItems = useCartStore(selectTotalItems);
  const lines = selectCart(items, products);
  const subtotal = availableSubtotal(lines);
  const allAvailable = lines.every((line) => line.status === "available");
  const clearCart = useCartStore((state) => state.clearCart);

  if (!hydrated) return <p role="status" className="py-12 text-neutral-600">Loading your cart…</p>;

  if (items.length === 0) return (
    <div className="py-16 text-center">
      {products === null && <CatalogueRetry />}
      <h2 className="text-2xl font-semibold">Your cart is empty.</h2>
      <p className="mt-3 text-neutral-600">Find a jersey for your next match day.</p>
      <Link href="/shop" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-neutral-950 px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4">Continue Shopping</Link>
    </div>
  );

  return (
    <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        {products === null && <CatalogueRetry />}
        <ul aria-label="Cart items">{lines.map((line) => <CartLine key={`${line.item.productId}:${line.item.selectedSize}`} line={line} />)}</ul>
        <button type="button" onClick={clearCart} className="mt-4 min-h-11 rounded-sm text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">Clear cart</button>
      </div>
      {products !== null && <section aria-labelledby="summary-heading" className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        <h2 id="summary-heading" className="text-lg font-semibold">Cart summary</h2>
        <p role="status" className="mt-4 text-sm text-neutral-600">{totalItems} {totalItems === 1 ? "item" : "items"}</p>
        <dl className="mt-4 flex justify-between gap-4 font-semibold"><dt>{allAvailable ? "Subtotal" : "Available items subtotal"}</dt><dd>{formatCurrency(subtotal)}</dd></dl>
        <p className="mt-3 text-sm leading-6 text-neutral-600">Delivery charges are not included. Checkout is coming soon.</p>
        {allAvailable ? <Link href="/checkout" className="mt-6 flex min-h-12 items-center justify-center rounded-md bg-neutral-950 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4">Proceed to Checkout</Link> : <p role="status" className="mt-6 text-sm">Resolve unavailable selections before proceeding. They are excluded from this subtotal.</p>}
        <Link href="/shop" className="mt-3 flex min-h-11 items-center justify-center rounded-md border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4">Continue Shopping</Link>
      </section>}
    </div>
  );
}
