import { CartPage, Stack, Heading, Text } from "@sd/ui";
import { CartContents } from "@/components/cart/cart-contents";
import { getCatalogueSnapshot } from "@/lib/products/snapshot";
export default async function Page() {
  const products = await getCatalogueSnapshot();
  return (
    <CartPage><Stack gap="6">
      <Stack gap="2">
        <Text look="eyebrow" muted>
          Your personal line-up
        </Text>
        <Heading as="h1">Your Cart</Heading>
      </Stack>
      <CartContents products={products} />
    </Stack></CartPage>
  );
}
