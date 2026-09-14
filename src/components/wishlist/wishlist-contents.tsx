"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/product/product-grid";
import { products } from "@/data/products";
import { useWishlistStore } from "@/store/wishlist-store";
import { useWishlistHydration } from "@/components/wishlist/use-wishlist-hydration";

export function WishlistContents() {
  const hydrated = useWishlistHydration();
  const items = useWishlistStore((state) => state.items);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const savedProducts = products.filter((product) => items.includes(product.id));

  if (!hydrated) return <p role="status" className="py-12 text-neutral-600">Loading your wishlist…</p>;

  if (savedProducts.length === 0) return (
    <div className="py-16 text-center">
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
      <p role="status" className="mb-4 text-sm text-neutral-600">{savedProducts.length} saved {savedProducts.length === 1 ? "jersey" : "jerseys"}. Use the heart button to remove a jersey.</p>
      <ProductGrid products={savedProducts} />
    </section>
  );
}
