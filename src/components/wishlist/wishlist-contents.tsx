"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/product/product-grid";
import { selectWishlist } from "@/lib/products/selection";
import type { Product } from "@/types/product";
import { CatalogueRetry } from "@/components/product/catalogue-retry";
import { useWishlistStore } from "@/store/wishlist-store";
import { useWishlistHydration } from "@/components/wishlist/use-wishlist-hydration";

export function WishlistContents({ products }: { products: Product[] | null }) {
  const hydrated = useWishlistHydration();
  const items = useWishlistStore((state) => state.items);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const selected = selectWishlist(items, products ?? []);

  if (!hydrated) return <p role="status" className="py-12 text-neutral-600">Loading your wishlist…</p>;

  if (items.length === 0) return (
    <div className="py-16 text-center">
      {products === null && <CatalogueRetry />}
      <h2 className="text-2xl font-semibold">Your wishlist is empty.</h2>
      <p className="mt-3 text-neutral-600">Save your favourite jerseys to find them here.</p>
      <Link href="/shop" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-neutral-950 px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4">Explore the shop</Link>
    </div>
  );

  return (
    <section aria-labelledby="saved-products-heading" className="mt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 id="saved-products-heading" className="text-xl font-semibold">Saved Jerseys</h2>
        <button type="button" onClick={clearWishlist} className="min-h-11 rounded-sm px-2 text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">Clear wishlist</button>
      </div>
      <p role="status" className="mb-4 text-sm text-neutral-600">{items.length} saved {items.length === 1 ? "jersey" : "jerseys"}. Use the heart button to remove a jersey.</p>
      {products === null ? <CatalogueRetry /> : selected.products.length > 0 && <ProductGrid products={selected.products} />}
      {selected.unavailableIds.length > 0 && <ul aria-label="Unavailable saved selections" className="mt-6 space-y-4">
        {selected.unavailableIds.map((id) => <li key={id} className="flex flex-wrap items-center justify-between gap-3 border-t py-4">
          <span>{products === null ? "Product details unavailable" : "This saved product is no longer available."}</span>
          <button type="button" onClick={() => removeItem(id)} className="min-h-11 rounded-sm px-3 underline focus-visible:outline-2 focus-visible:outline-offset-2">Remove<span className="sr-only"> unavailable saved selection</span></button>
        </li>)}
      </ul>}
    </section>
  );
}
