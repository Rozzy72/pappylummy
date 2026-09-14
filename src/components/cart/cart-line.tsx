"use client";

import Image from "next/image";
import Link from "next/link";
import type { CartItem } from "@/types/cart";
import { MAX_CART_QUANTITY, useCartStore } from "@/store/cart-store";
import { formatCurrency } from "@/utils/format-currency";
import { getProductImage } from "@/utils/product-image";

export function CartLine({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const identity = `${item.name}, size ${item.selectedSize}`;
  const controlStyle = "size-11 rounded-md border border-neutral-300 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <li className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 border-b border-neutral-200 py-6 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <Image src={getProductImage(item.image)} alt={item.name} width={112} height={140} className="h-auto w-full rounded-md bg-neutral-100" />
      <div className="min-w-0">
        <h2 className="text-base font-semibold">
          <Link href={`/product/${encodeURIComponent(item.slug)}`} className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">{item.name}</Link>
        </h2>
        <p className="mt-1 text-sm text-neutral-600">Size: {item.selectedSize}</p>
        <p className="mt-2 text-sm">Unit price: {formatCurrency(item.price)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div role="group" aria-label={`Quantity for ${identity}`} className="flex items-center gap-2">
            <button type="button" className={controlStyle} aria-label={`Decrease quantity for ${identity}`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.productId, item.selectedSize, item.quantity - 1)}>−</button>
            <output aria-live="polite" aria-label={`Quantity for ${identity}`} className="min-w-6 text-center">{item.quantity}</output>
            <button type="button" className={controlStyle} aria-label={`Increase quantity for ${identity}`} disabled={item.quantity >= MAX_CART_QUANTITY} onClick={() => updateQuantity(item.productId, item.selectedSize, item.quantity + 1)}>+</button>
          </div>
          <button type="button" aria-label={`Remove ${identity} from cart`} onClick={() => removeItem(item.productId, item.selectedSize)} className="min-h-11 rounded-sm px-2 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">Remove</button>
        </div>
        <p className="mt-4 text-sm font-semibold">Line total: {formatCurrency(item.price * item.quantity)}</p>
      </div>
    </li>
  );
}
