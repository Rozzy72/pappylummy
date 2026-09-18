import { WishlistContents } from "@/components/wishlist/wishlist-contents";
import { getCatalogueSnapshot } from "@/lib/products/snapshot";

export default async function WishlistPage() {
  const products = await getCatalogueSnapshot();
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Wishlist</h1>
      <WishlistContents products={products} />
    </>
  );
}
