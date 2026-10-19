"use client";
import {
  Stack,
  Box,
  Grid,
  Heading,
  Text,
  Flex,
  LinkButton,
  Button,
  Alert,
  FieldLabel,
  Select,
  Input,
  Form,
} from "@sd/ui";
import { useState } from "react";
import { NIGERIAN_STATES, stateDeliveryFee } from "@/lib/delivery";
import { useCartHydration } from "@/components/cart/use-cart-hydration";
import { useCartStore } from "@/store/cart-store";
import { selectCart, availableSubtotal } from "@/lib/products/selection";
import {
  cartLineKey,
  jerseyUnitPrice,
  PERSONALIZATION_PRICE,
} from "@/lib/personalization";
import { CatalogueRetry } from "@/components/product/catalogue-retry";
import { formatCurrency } from "@/utils/format-currency";
import type { Product } from "@/types/product";
export function CheckoutReview({ products }: { products: Product[] | null }) {
  const [zone, setZone] = useState("");
  const fee = stateDeliveryFee(zone);
  const [details, setDetails] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });
  const [reviewed, setReviewed] = useState(false);
  function updateDetails(field: keyof typeof details, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
    setReviewed(false);
  }
  const hydrated = useCartHydration();
  const items = useCartStore((s) => s.items);
  if (!hydrated) return <Text role="status">Loading your bag…</Text>;
  if (!items.length)
    return (
      <Stack gap="5">
        <Heading>Your bag is empty.</Heading>
        <Text>Add a jersey before reviewing your order.</Text>
        <LinkButton href="/shop">Explore jerseys</LinkButton>
      </Stack>
    );
  const lines = selectCart(items, products);
  const available = lines.every((l) => l.status === "available");
  return (
    <Grid layout="split">
      <Stack gap="6">
        <Box surface="paper" border p="6">
          <Stack gap="4">
            <Text look="eyebrow">01 / Your selection</Text>
            <Heading>Check your line-up.</Heading>
            {products === null && <CatalogueRetry />}
            {lines.map(({ item, product, status }) => (
              <Box key={cartLineKey(item)} py="4">
                <Stack gap="2">
                  <Heading as="h3">
                    {product?.name ?? "Product details unavailable"}
                  </Heading>
                  <Text look="small">
                    Size {item.selectedSize} · Quantity {item.quantity}
                  </Text>
                  {item.personalization && (
                    <>
                      <Text look="small">
                        Name: {item.personalization.name} · Number:{" "}
                        {item.personalization.number}
                      </Text>
                      <Text look="small" muted>
                        Printing: {formatCurrency(PERSONALIZATION_PRICE)} per
                        jersey
                      </Text>
                    </>
                  )}
                  {status === "available" && product ? (
                    <Text look="price">
                      {formatCurrency(
                        jerseyUnitPrice(
                          product.price,
                          Boolean(item.personalization),
                        ) * item.quantity,
                      )}
                    </Text>
                  ) : (
                    <Text role="status">
                      This selection needs attention. Return to your bag to
                      review availability.
                    </Text>
                  )}
                </Stack>
              </Box>
            ))}
            <LinkButton href="/cart" variant="surface">
              Edit your bag
            </LinkButton>
          </Stack>
        </Box>
        <Box surface="paper" border p="6">
          <Stack gap="3">
            <Text look="eyebrow">02 / Delivery</Text>
            <Heading as="h3">Where are we delivering?</Heading>
            <Text muted>
              Dispatch from Osogbo. Flat delivery is ₦2,000 within Osun State or
              ₦5,000 elsewhere in Nigeria, per order. No additional distance
              charge.
            </Text>
            <Form
              onSubmit={(event) => {
                event.preventDefault();
                setReviewed(true);
              }}
            >
              {(
                [
                  {
                    key: "name",
                    label: "Full name",
                    auto: "name",
                    type: "text",
                    max: 100,
                  },
                  {
                    key: "email",
                    label: "Email address",
                    auto: "email",
                    type: "email",
                    max: 254,
                  },
                  {
                    key: "phone",
                    label: "Phone number",
                    auto: "tel",
                    type: "tel",
                    max: 25,
                  },
                  {
                    key: "address",
                    label: "Street address",
                    auto: "street-address",
                    type: "text",
                    max: 200,
                  },
                  {
                    key: "city",
                    label: "City / town",
                    auto: "address-level2",
                    type: "text",
                    max: 100,
                  },
                ] as const
              ).map((field) => (
                <Stack gap="2" key={field.key}>
                  <FieldLabel htmlFor={`delivery-${field.key}`}>
                    {field.label}
                  </FieldLabel>
                  <Input
                    id={`delivery-${field.key}`}
                    name={field.key}
                    title={
                      field.key === "phone"
                        ? "Use 7–15 digits, optionally starting with + (for example +2348012345678)."
                        : undefined
                    }
                    type={field.type}
                    autoComplete={field.auto}
                    required
                    maxLength={field.max}
                    pattern={
                      field.key === "phone"
                        ? "[+]?[0-9]{7,15}"
                        : field.type === "text"
                          ? ".*\\S.*"
                          : undefined
                    }
                    value={details[field.key]}
                    onChange={(event) =>
                      updateDetails(field.key, event.target.value)
                    }
                  />
                </Stack>
              ))}
              <Stack gap="2">
                <FieldLabel htmlFor="delivery-zone">State / FCT</FieldLabel>
                <Select
                  id="delivery-zone"
                  name="state"
                  autoComplete="address-level1"
                  required
                  value={zone}
                  onChange={(event) => {
                    setZone(event.target.value);
                    setReviewed(false);
                  }}
                  aria-describedby="delivery-help"
                >
                  <option value="">Choose state</option>
                  {NIGERIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </Select>
              </Stack>
              <Text look="small" muted>
                Country: Nigeria. Your details stay on this page and are cleared
                when you leave or reload.
              </Text>
              <Button type="submit" fullWidth disabled={!available}>
                Review delivery details
              </Button>
            </Form>
            {reviewed && (
              <Box surface="muted" p="4">
                <Stack gap="2">
                  <Heading as="h3">Deliver to</Heading>
                  <Text>{details.name.trim()}</Text>
                  <Text>
                    {details.email.trim()} · {details.phone.trim()}
                  </Text>
                  <Text>
                    {details.address.trim()}, {details.city.trim()}, {zone},
                    Nigeria
                  </Text>
                  <Text role="status">
                    Details ready for review. No order has been submitted.
                  </Text>
                  <Button
                    variant="link"
                    onClick={() => {
                      setReviewed(false);
                      document.getElementById("delivery-name")?.focus();
                    }}
                  >
                    Edit delivery details
                  </Button>
                </Stack>
              </Box>
            )}
            <Text id="delivery-help" look="small" muted>
              Select a destination to calculate your total. Delivery outside
              Nigeria is not available in this preview.
            </Text>
          </Stack>
        </Box>
      </Stack>
      <Box surface="paper" border p="6">
        <Stack gap="5">
          <Text look="eyebrow">03 / Order summary</Text>
          <Heading>Your match-day total.</Heading>
          {products !== null && (
            <Flex justify="between" wrap>
              <Text>
                {available ? "Items subtotal" : "Available items subtotal"}
              </Text>
              <Text look="price">
                {formatCurrency(availableSubtotal(lines))}
              </Text>
            </Flex>
          )}
          <Text look="small" muted>
            Includes name + number printing on personalized jerseys.
          </Text>
          <Flex justify="between" wrap>
            <Text>Delivery</Text>
            <Text>
              {fee === null ? "Select destination" : formatCurrency(fee)}
            </Text>
          </Flex>
          <Flex justify="between" wrap>
            <Text>Final total</Text>
            <Text look="price" aria-live="polite">
              {!available
                ? "Resolve unavailable items"
                : fee === null
                  ? "Select destination"
                  : formatCurrency(availableSubtotal(lines) + fee)}
            </Text>
          </Flex>
          {!available && (
            <Alert>
              Resolve unavailable selections in your bag before ordering. They
              are excluded from the subtotal.
            </Alert>
          )}
          <Button disabled fullWidth>
            Payment coming soon
          </Button>
          <Text look="small" muted>
            This is an order preview. No order is created, stock reserved, or
            payment taken.
          </Text>
        </Stack>
      </Box>
    </Grid>
  );
}

