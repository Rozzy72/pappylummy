"use client";

import { useWishlistStore } from "@/store/wishlist-store";
import { useWishlistHydration } from "@/components/wishlist/use-wishlist-hydration";

type WishlistButtonProps = {
  productId: string;
  productName: string;
  showLabel?: boolean;
  className?: string;
};

export function WishlistButton({
  productId, productName, showLabel = false, className = "",
}: WishlistButtonProps) {
  const hydrated = useWishlistHydration();
  const saved = useWishlistStore((state) => state.items.includes(productId));
  const toggleItem = useWishlistStore((state) => state.toggleItem);
  const isSaved = hydrated && saved;
  const label = isSaved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`;

  return (
    <button
      type="button"
      disabled={!hydrated}
      aria-label={label}
      aria-pressed={isSaved}
      title={label}
      onClick={() => toggleItem(productId)}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-50 ${isSaved ? "border-neutral-950 bg-neutral-950 text-white hover:bg-neutral-800" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"} ${className}`}
    >
      <svg viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className="size-5 shrink-0" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
      {showLabel && <span>{isSaved ? "Remove from wishlist" : "Save to wishlist"}</span>}
    </button>
  );
}
