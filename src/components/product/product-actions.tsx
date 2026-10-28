"use client";

import {
  Stack,
  Flex,
  Button,
  Text,
  ProductOptions,
  NavLink,
  Disclosure,
  PersonalizationFields, SwitchLabel, FieldLabel, Input, PurchaseActions,
} from "@sd/ui";
import { useId, useState } from "react";
import type { JerseySize, Product } from "@/types/product";
import { MAX_CART_QUANTITY, useCartStore } from "@/store/cart-store";
import { useCartHydration } from "@/components/cart/use-cart-hydration";

import {parsePersonalization,PERSONALIZATION_PRICE,jerseyUnitPrice} from "@/lib/personalization";
import {formatCurrency} from "@/utils/format-currency";

type ProductActionsProps = { product: Product };

// Presentation limits only; future orders require server-side inventory checks.
const maxQuantity = MAX_CART_QUANTITY;

export function ProductActions({ product }: ProductActionsProps) {
  const { sizes, inStock } = product;
  const [selectedSize, setSelectedSize] = useState<JerseySize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [custom,setCustom]=useState(false),[name,setName]=useState(""),[number,setNumber]=useState("");
  const personalization=custom?parsePersonalization({name,number}):undefined;
  const hydrated = useCartHydration();
  const addItem = useCartStore((state) => state.addItem);
  const messageId = useId();
  const canSelect = inStock && sizes.length > 0;

  return (
    <ProductOptions>
      <Stack gap="5">

        <fieldset disabled={!canSelect}>
          <legend>Select size</legend>
          <Flex gap="2" wrap>
            {sizes.map((size) => (
              <Button
                key={size}
                type="button"
                aria-pressed={selectedSize === size}
                onClick={() => {
                  setSelectedSize(size);
                  setFeedback("");
                }}
                variant={selectedSize === size ? "solid" : "surface"}
              >
                {size}
              </Button>
            ))}
          </Flex>
        </fieldset>
        <PersonalizationFields><SwitchLabel><span>Add name & number (+{formatCurrency(PERSONALIZATION_PRICE)})</span><input type="checkbox" role="switch" checked={custom} onChange={e=>{setCustom(e.target.checked);setFeedback("");}} /></SwitchLabel>{custom&&<Flex gap="3"><Stack gap="1"><FieldLabel htmlFor={messageId+"-name"}>Name (max. 16 characters)</FieldLabel><Input id={messageId+"-name"} value={name} maxLength={16} placeholder="e.g. ADEBAYO" onChange={e=>setName(e.target.value)} /></Stack><Stack gap="1"><FieldLabel htmlFor={messageId+"-number"}>Number (0–99)</FieldLabel><Input id={messageId+"-number"} inputMode="numeric" value={number} maxLength={2} placeholder="e.g. 10" onChange={e=>setNumber(e.target.value.replace(/[^0-9]/g,""))} /></Stack></Flex>}{custom&&<Text look="small">Personalized unit price: {formatCurrency(jerseyUnitPrice(product.price,true))}</Text>}</PersonalizationFields>
        <Disclosure title="Choosing your size">
          <Text look="small" muted>
            Choose from the sizes available for this jersey. Verified garment
            measurements are not yet available; size labels alone do not
            guarantee fit.
          </Text>
          <NavLink href="/guide">Sizing & shopping information →</NavLink>
        </Disclosure>
        <PurchaseActions><fieldset disabled={!canSelect}>
          <legend>Quantity</legend>
          <Flex gap="3">
            <Button
              type="button"
              aria-label="Decrease quantity"
              disabled={!canSelect || quantity <= 1}
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            >
              −
            </Button>
            <output aria-live="polite" aria-label="Quantity">
              {quantity}
            </output>
            <Button
              type="button"
              aria-label="Increase quantity"
              disabled={!canSelect || quantity >= maxQuantity}
              onClick={() =>
                setQuantity((current) => Math.min(maxQuantity, current + 1))
              }
            >
              +
            </Button>
          </Flex>
        </fieldset>
        <Button
          type="button"
          disabled={!hydrated || !canSelect}
          fullWidth
          size="3"
          aria-describedby={messageId}
          onClick={() => {
            if (!selectedSize) { setFeedback("Please select your jersey size above, then add it to your bag."); return; }
            if (custom && !personalization) { setFeedback("Please enter a valid name and number, or switch off name and number printing."); return; }
            const added = addItem(product, selectedSize, quantity, personalization ?? undefined);
            setFeedback(
              added
                ? `Added to cart: size ${selectedSize}, quantity ${quantity}.`
                : `Could not add this quantity. The cart limit is ${maxQuantity} per product and size.`,
            );
          }}
        >
          {inStock ? "Add to Cart" : "Out of stock"}
        </Button></PurchaseActions>
        <Text id={messageId} look="small" muted>
          {!inStock
            ? "This jersey is currently out of stock."
            : sizes.length === 0
              ? "No sizes are currently available for this jersey."
              : !hydrated
                ? "Loading your cart…"
                : !selectedSize
                  ? "Select a size to add this jersey to your cart."
                  : custom && !personalization ? "Enter your name and number to add this personalised jersey." : `Maximum ${maxQuantity} per product and size in your cart.`}
        </Text>
        <Text look="small" muted>No account required. You can shop and use your bag as a guest.</Text>
        <Text role="status" aria-atomic="true" look="small">
          {feedback}
        </Text>
        {feedback.startsWith("Added") && (
          <NavLink href="/cart">View your bag →</NavLink>
        )}
      </Stack>
    </ProductOptions>
  );
}
