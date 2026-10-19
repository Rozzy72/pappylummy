import { Stack, Heading, Text } from "@sd/ui";
import { WishlistContents } from "@/components/wishlist/wishlist-contents";
import { getCatalogueSnapshot } from "@/lib/products/snapshot";
export default async function Page() {
  const products = await getCatalogueSnapshot();
  return (
    <Stack gap="8">
      <Stack gap="2">
        <Text look="eyebrow" muted>
          Your personal line-up
        </Text>
        <Heading as="h1">Your wishlist.</Heading>
      </Stack>
      <WishlistContents products={products} />
    </Stack>
  );
}
