"use client";

import { useId, useState } from "react";
import type { JerseySize, Product } from "@/types/product";
import { MAX_CART_QUANTITY, useCartStore } from "@/store/cart-store";
import { useCartHydration } from "@/components/cart/use-cart-hydration";

type ProductActionsProps = Pick<Product, "sizes" | "inStock"> & { productId: Product["id"] };

// Presentation limits only; future orders require server-side inventory checks.
const maxQuantity = MAX_CART_QUANTITY;

export function ProductActions({ productId, sizes, inStock }: ProductActionsProps) {
  const [selectedSize, setSelectedSize] = useState<JerseySize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState("");
  const hydrated = useCartHydration();
  const addItem = useCartStore((state) => state.addItem);
  const messageId = useId();
  const canSelect = inStock && sizes.length > 0;

  return (
    <div className="mt-8 border-t border-neutral-200 pt-6">
      <fieldset disabled={!canSelect}>
        <legend className="text-sm font-semibold">Select size</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={selectedSize === size}
              onClick={() => { setSelectedSize(size); setFeedback(""); }}
              className={`min-h-11 min-w-11 rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${selectedSize === size ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 bg-white hover:bg-neutral-100"}`}
            >
              {size}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={!canSelect} className="mt-6">
        <legend className="text-sm font-semibold">Quantity</legend>
        <div className="mt-3 inline-flex items-center rounded-md border border-neutral-300">
          <button type="button" aria-label="Decrease quantity" disabled={!canSelect || quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="size-11 rounded-md text-lg hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40">
            −
          </button>
          <output aria-live="polite" aria-label="Quantity" className="min-w-12 text-center text-sm font-semibold">{quantity}</output>
          <button type="button" aria-label="Increase quantity" disabled={!canSelect || quantity >= maxQuantity} onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))} className="size-11 rounded-md text-lg hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40">
            +
          </button>
        </div>
      </fieldset>
      <button
        type="button"
        disabled={!hydrated || !canSelect || !selectedSize}
        aria-describedby={messageId}
        onClick={() => {
          if (!selectedSize) return;
          const added = addItem(productId, selectedSize, quantity);
          setFeedback(added ? `Added to cart: size ${selectedSize}, quantity ${quantity}.` : `Could not add this quantity. The cart limit is ${maxQuantity} per product and size.`);
        }}
        className="mt-6 min-h-12 w-full rounded-md bg-neutral-950 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-600"
      >
        {inStock ? "Add to Cart" : "Out of stock"}
      </button>
      <p id={messageId} className="mt-3 text-sm leading-6 text-neutral-600">
        {!inStock
          ? "This jersey is currently out of stock."
          : sizes.length === 0
            ? "No sizes are currently available for this jersey."
            : !hydrated ? "Loading your cart…" : !selectedSize ? "Select a size to add this jersey to your cart." : `Maximum ${maxQuantity} per product and size in your cart.`}
      </p>
      <p role="status" aria-atomic="true" className="mt-2 text-sm font-medium">{feedback}</p>
    </div>
  );
}
