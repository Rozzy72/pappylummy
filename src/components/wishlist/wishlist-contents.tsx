"use client";

import { Stack, Box, Flex, Text, Heading, Button, LinkButton } from "@sd/ui";
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

  if (!hydrated)
    return (
      <Text role="status" muted>
        Loading your wishlist…
      </Text>
    );
  if (items.length === 0)
    return (
      <Box width="narrow" surface="paper" p="9" border>
        <Stack gap="5">
          {products === null && <CatalogueRetry />}
          <Text look="eyebrow" muted>
            Keep your favourites close
          </Text>
          <Heading>Your wishlist is empty.</Heading>
          <Text muted>Tap the heart on a jersey to save it for later.</Text>
          <LinkButton href="/shop">Explore the collection →</LinkButton>
        </Stack>
      </Box>
    );
  return (
    <Stack as="section" aria-labelledby="saved-products-heading" gap="6">
      <Flex justify="between" wrap>
        <Heading id="saved-products-heading">Saved jerseys.</Heading>
        <Button variant="link" onClick={clearWishlist}>
          Clear wishlist
        </Button>
      </Flex>
      <Text role="status" muted>
        {items.length} saved {items.length === 1 ? "jersey" : "jerseys"}. Use
        the heart button to remove a jersey.
      </Text>
      {products === null ? (
        <CatalogueRetry />
      ) : (
        selected.products.length > 0 && (
          <ProductGrid products={selected.products} />
        )
      )}
      <Stack as="ul" aria-label="Unavailable saved selections">
        {selected.unavailableIds.map((id) => (
          <Box as="li" key={id} p="4" border>
            <Flex justify="between" wrap>
              <Text>
                {products === null
                  ? "Product details unavailable"
                  : "This saved product is no longer available."}
              </Text>
              <Button
                variant="link"
                onClick={() => removeItem(id)}
                aria-label="Remove unavailable saved selection"
              >
                Remove
              </Button>
            </Flex>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
