"use client";
import { submitGuestOrder, type OrderResult } from "@/app/checkout/actions";
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
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import type { CheckoutDetails } from "@/lib/checkout/profile";
import type { Product } from "@/types/product";
export function CheckoutReview({ products, ordersEnabled = false, initialDetails }: { products: Product[] | null; ordersEnabled?: boolean; initialDetails?: CheckoutDetails | null }) {
  const router=useRouter();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);
  const requestRef = useRef<{payload:string;key:string} | null>(null);
  const [zone, setZone] = useState(initialDetails?.state ?? "");
  const fee = stateDeliveryFee(zone);
  const [details, setDetails] = useState({
    name: initialDetails?.name ?? "",
    email: initialDetails?.email ?? "",
    phone: initialDetails?.phone ?? "",
    address: initialDetails?.address ?? "",
    city: initialDetails?.city ?? "",
  });
  const [reviewed, setReviewed] = useState(false);
  function updateDetails(field: keyof typeof details, value: string) {
    if (saving || result?.status === "success") return;
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
  async function saveOrder() {
    if (saving || !reviewed || !available || fee === null) return;
    const payload = {items, delivery:{...details,state:zone},expectedTotalKobo:Math.round((availableSubtotal(lines)+fee)*100)};
    const serialized=JSON.stringify(payload);
    if(requestRef.current?.payload!==serialized)requestRef.current={payload:serialized,key:crypto.randomUUID()};
    setSaving(true);setResult(null);
    try{const saved=await submitGuestOrder({key:requestRef.current!.key,...payload});setResult(saved);if(saved.status==="success")router.push("/checkout/confirmation");}
    catch{setResult({status:"error",message:"Unable to save your order request. Your bag has been kept."});}
    finally{setSaving(false);}
  }
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
                      <Text look="small">Personalization: {item.personalization.name}</Text>
                      <Text look="small">Number: {item.personalization.number}</Text>
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
              <fieldset disabled={saving || result?.status === "success"}>
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
                    label: "Order contact email",
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
                    if (saving || result?.status === "success") return;
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
                Country: Nigeria. Delivery details are saved only when you submit an order request.
              </Text>
              <Button type="submit" fullWidth disabled={!available}>
                Review delivery details
              </Button>
              </fieldset>
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
                    {result?.status === "success" ? "Delivery details saved with your order request." : "Details ready for review. No order has been submitted."}
                  </Text>
                  <Button
                    variant="link"
                    disabled={saving || result?.status === "success"}
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
          {ordersEnabled && <Stack gap="2">
            <Text look="small">Save an unpaid order request as a guest. No payment is taken and stock is not reserved.</Text>
            <Button fullWidth disabled={!reviewed || !available || fee === null || saving || result?.status === "success"} onClick={saveOrder}>{saving ? "Saving order request…" : "Save order request"}</Button>
            {!reviewed && <Text look="small">Review your delivery details first.</Text>}
            {result?.status === "success" && <LinkButton href="/checkout/confirmation">View your order request</LinkButton>}
            {result && <Text role="status" aria-live="polite">{result.status === "success" ? `Order request saved. Reference: ${result.reference}. Total: ${formatCurrency(result.totalKobo/100)}. Awaiting payment; nothing has been charged.` : result.message}</Text>}
          </Stack>}
          <Button disabled fullWidth>
            Payment coming soon
          </Button>
          <Text look="small" muted>
            {ordersEnabled ? "Order requests remain unpaid. Payment and fulfilment are not enabled yet." : "This is an order preview. No order is created, stock reserved, or payment taken."}
          </Text>
        </Stack>
      </Box>
    </Grid>
  );
}

