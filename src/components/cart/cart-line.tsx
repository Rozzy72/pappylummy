"use client";

import { PERSONALIZATION_PRICE, jerseyUnitPrice } from "@/lib/personalization";
import { ProductImage } from "@/components/product/product-image";
import {
  CartLinePanel,
  Stack,
  Flex,
  Text,
  Heading,
  NavLink,
  Button,
  ImageFrame, Disclosure, Icon,
} from "@sd/ui";
import type { CartSelection } from "@/lib/products/selection";
import { MAX_CART_QUANTITY, useCartStore } from "@/store/cart-store";
import { formatCurrency } from "@/utils/format-currency";

export function CartLine({ line }: { line: CartSelection }) {
  const { item, product, status } = line;
  const available = status === "available";
  const title =
    product?.name ??
    (status === "unverified"
      ? "Product details unavailable"
      : "Product unavailable");
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const identity = `${title}, size ${item.selectedSize}${item.personalization ? `, ${item.personalization.name} ${item.personalization.number}` : ""}`;
  const sizeTotal = useCartStore((state) =>
    state.items
      .filter(
        (i) =>
          i.productId === item.productId &&
          i.selectedSize === item.selectedSize,
      )
      .reduce((sum, i) => sum + i.quantity, 0),
  );

  return (
    <CartLinePanel>
      <Flex align="start" gap="4">
        {product && (
          <ImageFrame kind="thumb">
            <ProductImage
              reference={product.image}
              productId={product.id}
              alt={product.name}
              fill
              sizes="96px"
            />
          </ImageFrame>
        )}
        <Stack gap="2" grow>
          <Heading as="h3">
            {product ? (
              <NavLink href={`/product/${encodeURIComponent(product.slug)}`}>
                {title}
              </NavLink>
            ) : (
              title
            )}
          </Heading>
          <Text look="small" muted>
            Size: {item.selectedSize}
          </Text>
          {item.personalization && (
            <Text look="small">
              Personalization: {item.personalization.name} ·{" "}
              {item.personalization.number}
            </Text>
          )}
          {product && (
            <Text look="small">
              Unit price: {formatCurrency(jerseyUnitPrice(product.price,Boolean(item.personalization)))}
            </Text>
          )}
          {product && item.personalization && <Disclosure title="Printing price details"><Text look="small">Base jersey price: {formatCurrency(product.price)}. Name + number printing: {formatCurrency(PERSONALIZATION_PRICE)} per jersey.</Text></Disclosure>}
          {!available && (
            <Text look="small">
              {status === "out-of-stock"
                ? "Out of stock. Remove this item or check back later."
                : status === "size-unavailable"
                  ? "This size is no longer available. Choose another size on the product page."
                  : status === "unverified"
                    ? "Retry product details to check availability."
                    : "This product is no longer available."}
            </Text>
          )}
          <Flex gap="2" wrap>
            <Flex gap="2" role="group" aria-label={`Quantity for ${identity}`}>
              <Button
                variant="surface"
                size="1"
                aria-label={`Decrease quantity for ${identity}`}
                disabled={item.quantity <= 1}
                onClick={() =>
                  updateQuantity(
                    item.productId,
                    item.selectedSize,
                    item.quantity - 1,
                    item.personalization,
                  )
                }
              >
                −
              </Button>
              <output
                aria-live="polite"
                aria-label={`Quantity for ${identity}`}
              >
                {item.quantity}
              </output>
              <Button
                variant="surface"
                size="1"
                aria-label={`Increase quantity for ${identity}`}
                disabled={!available || sizeTotal >= MAX_CART_QUANTITY}
                onClick={() =>
                  updateQuantity(
                    item.productId,
                    item.selectedSize,
                    item.quantity + 1,
                    item.personalization,
                  )
                }
              >
                +
              </Button>
            </Flex>
            <Button
              variant="link"
              size="1"
              aria-label={`Remove ${identity} from cart`}
              onClick={() =>
                removeItem(
                  item.productId,
                  item.selectedSize,
                  item.personalization,
                )
              }
            >
              Remove
            </Button>
          </Flex>
          {available && product && (
            <Text look="card">
              Line total: {formatCurrency(jerseyUnitPrice(product.price, Boolean(item.personalization)) * item.quantity)}
            </Text>
          )}
        </Stack>
      </Flex>
    </CartLinePanel>
  );
}
