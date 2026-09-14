import { WishlistContents } from "@/components/wishlist/wishlist-contents";

export default function WishlistPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Wishlist</h1>
      <WishlistContents />
    </>
  );
}
