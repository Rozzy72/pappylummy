import { normalizeProductId, resolveProduct } from "@/lib/products/identity";
import type { CartItem } from "@/types/cart";

export const MAX_CART_QUANTITY = 10;
export const PRODUCT_ID_PERSISTENCE_VERSION = 2;

export function validQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_CART_QUANTITY;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function reconcileCart(saved: unknown): CartItem[] {
  if (!record(saved) || !Array.isArray(saved.items)) return [];
  const items: CartItem[] = [];
  for (const entry of saved.items) {
    if (!record(entry) || typeof entry.quantity !== "number" || !validQuantity(entry.quantity)) continue;
    const product = resolveProduct(entry.productId);
    if (!product?.inStock) continue;
    const size = product.sizes.find((candidate) => candidate === entry.selectedSize);
    if (!size) continue;
    const existing = items.find((item) => item.productId === product.id && item.selectedSize === size);
    if (existing) {
      existing.quantity = Math.min(MAX_CART_QUANTITY, existing.quantity + entry.quantity);
    } else {
      items.push({
        productId: product.id, slug: product.slug, name: product.name,
        image: product.image, price: product.price, selectedSize: size, quantity: entry.quantity,
      });
    }
  }
  return items;
}


export function reconcileWishlist(saved: unknown): string[] {
  if (!record(saved) || !Array.isArray(saved.items)) return [];
  const ids = saved.items.map(normalizeProductId).filter((id): id is string => id !== undefined);
  return [...new Set(ids)];
}
