import { parsePersonalization, cartLineKey } from "@/lib/personalization";
import { normalizeProductId } from "@/lib/products/identity";
import type { CartItem } from "@/types/cart";
import type { JerseySize } from "@/types/product";

export const MAX_CART_QUANTITY = 10;
export const PRODUCT_ID_PERSISTENCE_VERSION = 3;
export const CART_PERSISTENCE_VERSION = 4;
const sizes: readonly JerseySize[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
];

export function validQuantity(quantity: number): boolean {
  return (
    Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_CART_QUANTITY
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function reconcileCart(
  saved: unknown,
  allowPersonalization = true,
): CartItem[] {
  if (!record(saved) || !Array.isArray(saved.items)) return [];
  const items: CartItem[] = [];
  for (const entry of saved.items) {
    if (
      !record(entry) ||
      typeof entry.quantity !== "number" ||
      !validQuantity(entry.quantity)
    )
      continue;
    const productId = normalizeProductId(entry.productId);
    const selectedSize = sizes.find((size) => size === entry.selectedSize);
    if (!productId || !selectedSize) continue;
    const personalization =
      allowPersonalization && entry.personalization !== undefined
        ? parsePersonalization(entry.personalization)
        : undefined;
    if (
      allowPersonalization &&
      entry.personalization !== undefined &&
      !personalization
    )
      continue;
    const candidate = {
      productId,
      selectedSize,
      quantity: entry.quantity,
      ...(personalization ? { personalization } : {}),
    };
    const existing = items.find(
      (item) => cartLineKey(item) === cartLineKey(candidate),
    );
    const allocated = items
      .filter(
        (item) =>
          item.productId === productId && item.selectedSize === selectedSize,
      )
      .reduce((sum, item) => sum + item.quantity, 0);
    const quantity = Math.min(entry.quantity, MAX_CART_QUANTITY - allocated);
    if (quantity <= 0) continue;
    if (existing) existing.quantity += quantity;
    else items.push({ ...candidate, quantity });
  }
  return items;
}

export function reconcileWishlist(saved: unknown): string[] {
  if (!record(saved) || !Array.isArray(saved.items)) return [];
  return [
    ...new Set(
      saved.items
        .map(normalizeProductId)
        .filter((id): id is string => id !== undefined),
    ),
  ];
}

export function migrateCart(
  saved: unknown,
  version: number,
): { items: CartItem[] } {
  return {
    items:
      version === 1 || version === 2 || version === 3
        ? reconcileCart(saved, false)
        : [],
  };
}

export function migrateWishlist(
  saved: unknown,
  version: number,
): { items: string[] } {
  return {
    items: version === 1 || version === 2 ? reconcileWishlist(saved) : [],
  };
}

/** Validate the envelope too: Zustand otherwise accepts a nonnumeric/missing version. */
export function readPersistedSelections(
  raw: string | null,
  maxVersion = PRODUCT_ID_PERSISTENCE_VERSION,
): string | null {
  if (raw === null) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    return record(saved) &&
      typeof saved.version === "number" &&
      Number.isInteger(saved.version) &&
      saved.version >= 1 &&
      saved.version <= maxVersion &&
      record(saved.state)
      ? raw
      : null;
  } catch {
    return null;
  }
}
