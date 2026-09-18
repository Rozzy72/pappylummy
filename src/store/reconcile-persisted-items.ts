import { normalizeProductId } from "@/lib/products/identity";
import type { CartItem } from "@/types/cart";
import type { JerseySize } from "@/types/product";

export const MAX_CART_QUANTITY = 10;
export const PRODUCT_ID_PERSISTENCE_VERSION = 3;
const sizes: readonly JerseySize[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

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
    const productId = normalizeProductId(entry.productId);
    const selectedSize = sizes.find((size) => size === entry.selectedSize);
    if (!productId || !selectedSize) continue;
    const existing = items.find((item) => item.productId === productId && item.selectedSize === selectedSize);
    if (existing) existing.quantity = Math.min(MAX_CART_QUANTITY, existing.quantity + entry.quantity);
    else items.push({ productId, selectedSize, quantity: entry.quantity });
  }
  return items;
}

export function reconcileWishlist(saved: unknown): string[] {
  if (!record(saved) || !Array.isArray(saved.items)) return [];
  return [...new Set(saved.items.map(normalizeProductId).filter((id): id is string => id !== undefined))];
}

export function migrateCart(saved: unknown, version: number): { items: CartItem[] } {
  return { items: version === 1 || version === 2 ? reconcileCart(saved) : [] };
}

export function migrateWishlist(saved: unknown, version: number): { items: string[] } {
  return { items: version === 1 || version === 2 ? reconcileWishlist(saved) : [] };
}

/** Validate the envelope too: Zustand otherwise accepts a nonnumeric/missing version. */
export function readPersistedSelections(raw: string | null): string | null {
  if (raw === null) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    return record(saved) && (saved.version === 1 || saved.version === 2 || saved.version === PRODUCT_ID_PERSISTENCE_VERSION)
      && record(saved.state) ? raw : null;
  } catch { return null; }
}
