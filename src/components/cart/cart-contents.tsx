"use client";

import { cartLineKey, PERSONALIZATION_PRICE } from "@/lib/personalization";
import {
  Stack,
  Box,
  CartLayout,
  Flex,
  Text,
  Heading,
  LinkButton,
  Button,
} from "@sd/ui";
import { CartLine } from "@/components/cart/cart-line";
import { useCartHydration } from "@/components/cart/use-cart-hydration";
import { selectTotalItems, useCartStore } from "@/store/cart-store";
import { formatCurrency } from "@/utils/format-currency";

import type { Product } from "@/types/product";
import { selectCart, availableSubtotal } from "@/lib/products/selection";
import { CatalogueRetry } from "@/components/product/catalogue-retry";

export function CartContents({ products }: { products: Product[] | null }) {
  const hydrated = useCartHydration();
  const items = useCartStore((state) => state.items);
  const totalItems = useCartStore(selectTotalItems);
  const lines = selectCart(items, products);
  const printingSubtotal = lines.reduce(
    (sum, line) =>
      sum +
      (line.status === "available" && line.item.personalization
        ? PERSONALIZATION_PRICE * line.item.quantity
        : 0),
    0,
  );
  const subtotal = availableSubtotal(lines);
  const allAvailable = lines.every((line) => line.status === "available");
  const clearCart = useCartStore((state) => state.clearCart);

  if (!hydrated)
    return (
      <Text role="status" muted>
        Loading your cart…
      </Text>
    );
  if (items.length === 0)
    return (
      <Box width="narrow" surface="paper" p="9" border>
        <Stack gap="5">
          {products === null && <CatalogueRetry />}
          <Text look="eyebrow" muted>
            Your next match day starts here
          </Text>
          <Heading>Your cart is empty.</Heading>
          <Text muted>
            Find a jersey that feels like you. Your selections will be saved on
            this browser.
          </Text>
          <LinkButton href="/shop">Find your colours →</LinkButton>
        </Stack>
      </Box>
    );
  return (
    <CartLayout>
      <Stack>
        {products === null && <CatalogueRetry />}
        <ul aria-label="Cart items">
          {lines.map((line) => (
            <CartLine key={cartLineKey(line.item)} line={line} />
          ))}
        </ul>
        <Flex>
          <Button variant="link" onClick={clearCart}>
            Clear cart
          </Button>
        </Flex>
      </Stack>
      {products !== null && (
        <Box
          as="section"
          aria-labelledby="summary-heading"
          p="6"
          surface="paper"
          border
        >
          <Stack gap="5">
            <Heading as="h2" id="summary-heading">
              Order Summary
            </Heading>
            <Text role="status" muted>
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </Text>
            <Flex justify="between" wrap>
              <Text>
                {allAvailable ? "Subtotal" : "Available items subtotal"}
              </Text>
              <Text look="price">{formatCurrency(subtotal)}</Text>
            </Flex>
            {printingSubtotal > 0 && (
              <Text look="small" muted>
                Includes {formatCurrency(printingSubtotal)} for name + number
                printing.
              </Text>
            )}
            <Text muted>
              Delivery is not included. Checkout is coming soon; no order will
              be placed.
            </Text>
            <Text look="small" muted>No sign-in required. Continue to the order preview as a guest.</Text>
            {!allAvailable && (
              <Text role="status">
                Resolve unavailable selections before ordering. They are
                excluded from this subtotal.
              </Text>
            )}
            {allAvailable && (
              <LinkButton href="/checkout" fullWidth>
                Continue as guest →
              </LinkButton>
            )}
            <LinkButton href="/shop" fullWidth variant="surface">
              Continue shopping
            </LinkButton>
            <LinkButton href="/guide" variant="link">
              Shopping information
            </LinkButton>
          </Stack>
        </Box>
      )}
    </CartLayout>
  );
}
