"use client";

import { Button, Icon } from "@sd/ui";
import { useWishlistStore } from "@/store/wishlist-store";
import { useWishlistHydration } from "@/components/wishlist/use-wishlist-hydration";

type WishlistButtonProps = {
  productId: string;
  productName: string;
  showLabel?: boolean;
};

export function WishlistButton({
  productId,
  productName,
  showLabel = false,
}: WishlistButtonProps) {
  const hydrated = useWishlistHydration();
  const saved = useWishlistStore((state) => state.isWishlisted(productId));
  const toggleItem = useWishlistStore((state) => state.toggleItem);
  const isSaved = hydrated && saved;
  const label = isSaved
    ? `Remove ${productName} from wishlist`
    : `Save ${productName} to wishlist`;

  return (
    <Button
      variant={isSaved ? "solid" : "surface"}
      radius="full"
      size="1"
      disabled={!hydrated}
      aria-label={label}
      aria-pressed={isSaved}
      title={label}
      onClick={() => toggleItem(productId)}
    >
      <Icon name="heart" />
      {showLabel && (
        <span>{isSaved ? "Remove from wishlist" : "Save to wishlist"}</span>
      )}
    </Button>
  );
}
