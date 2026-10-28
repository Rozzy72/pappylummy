import {getCheckoutProfile} from "@/lib/checkout/profile";
import { guestOrdersEnabled } from "@/lib/checkout/config";
import { Stack, Heading, Text, NavLink } from "@sd/ui";
import { getCatalogueSnapshot } from "@/lib/products/snapshot";
import { CheckoutReview } from "@/components/checkout/checkout-review";
export const dynamic = "force-dynamic";
export const metadata = { title: "Review your order | PappyLummy" };
export default async function Checkout() {
  const [products, profile] = await Promise.all([getCatalogueSnapshot(), getCheckoutProfile()]);
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
      <Stack gap="2">
        <Text>{profile.signedIn ? "Your saved profile details are filled in below. You can edit them for this delivery." : "Continue as a guest — no account required for this order preview."}</Text>
        {!profile.signedIn && <Text look="small" muted>Already have an account? <NavLink href="/login">Sign in</NavLink></Text>}
      </Stack>
      <CheckoutReview initialDetails={profile.details} products={products} ordersEnabled={guestOrdersEnabled()} />
    </Stack>
  );
}
