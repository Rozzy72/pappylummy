import { Stack, Heading, Text } from "@sd/ui";
import { getCatalogueSnapshot } from "@/lib/products/snapshot";
import { CheckoutReview } from "@/components/checkout/checkout-review";
export const metadata = { title: "Review your order | PappyLummy" };
export default async function Checkout() {
  const products = await getCatalogueSnapshot();
  return (
    <Stack gap="8">
      <Stack gap="2">
        <Text look="eyebrow" muted>
          Order preview
        </Text>
        <Heading as="h1">One step closer to match day.</Heading>
        <Text muted>
          Review your jerseys, personalization and delivery fee before payment
          becomes available.
        </Text>
      </Stack>
      <CheckoutReview products={products} />
    </Stack>
  );
}
