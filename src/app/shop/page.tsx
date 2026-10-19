import { Stack, Heading, Text } from "@sd/ui";
import { ShopCatalogue } from "@/components/product/shop-catalogue";
import { getProducts } from "@/lib/products/queries";
export default async function ShopPage() {
  const products = await getProducts();
  return (
    <Stack gap="6">
      <Stack gap="3">
        <Text look="eyebrow" muted>
          The PappyLummy collection
        </Text>
        <Heading as="h1">Find your colours.</Heading>
        <Text muted>
          New favourites. Old loyalties. A shirt for every kind of fan.
        </Text>
      </Stack>
      <ShopCatalogue
        products={products}
      />
    </Stack>
  );
}
