"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { products } from "@/data/products";
import type { CartItem } from "@/types/cart";
import type { JerseySize } from "@/types/product";

export const MAX_CART_QUANTITY = 10;

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  addItem: (productId: string, selectedSize: JerseySize, quantity: number) => boolean;
  removeItem: (productId: string, selectedSize: JerseySize) => void;
  updateQuantity: (productId: string, selectedSize: JerseySize, quantity: number) => void;
  clearCart: () => void;
};

function validQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_CART_QUANTITY;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function restoreItems(saved: unknown): CartItem[] {
  if (!record(saved) || !Array.isArray(saved.items)) return [];
  const items: CartItem[] = [];
  for (const entry of saved.items) {
    if (!record(entry) || typeof entry.quantity !== "number" || !validQuantity(entry.quantity)) continue;
    const product = products.find((candidate) => candidate.id === entry.productId);
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

// Storage can be unavailable (privacy settings/quota); retain a usable memory cart.
const safeStorage: StateStorage = {
  getItem: (name) => {
    try { return window.localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name, value) => {
    try { window.localStorage.setItem(name, value); } catch { /* Memory cart remains usable. */ }
  },
  removeItem: (name) => {
    try { window.localStorage.removeItem(name); } catch { /* Storage may be disabled. */ }
  },
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      addItem: (productId, selectedSize, quantity) => {
        if (!get().hydrated || !validQuantity(quantity)) return false;
        const product = products.find((candidate) => candidate.id === productId);
        if (!product?.inStock || !product.sizes.includes(selectedSize)) return false;
        const existing = get().items.find((item) => item.productId === productId && item.selectedSize === selectedSize);
        if ((existing?.quantity ?? 0) + quantity > MAX_CART_QUANTITY) return false;
        set((state) => ({
          items: existing
            ? state.items.map((item) => item.productId === productId && item.selectedSize === selectedSize
              ? { ...item, quantity: item.quantity + quantity } : item)
            : [...state.items, {
              productId: product.id, slug: product.slug, name: product.name,
              image: product.image, price: product.price, selectedSize, quantity,
            }],
        }));
        return true;
      },
      removeItem: (productId, selectedSize) => {
        if (!get().hydrated) return;
        set((state) => ({ items: state.items.filter((item) => item.productId !== productId || item.selectedSize !== selectedSize) }));
      },
      updateQuantity: (productId, selectedSize, quantity) => {
        if (!get().hydrated || !validQuantity(quantity)) return;
        set((state) => ({ items: state.items.map((item) => item.productId === productId && item.selectedSize === selectedSize ? { ...item, quantity } : item) }));
      },
      clearCart: () => { if (get().hydrated) set({ items: [] }); },
    }),
    {
      name: "naija-kits-cart",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
      merge: (saved: unknown, current) => ({ ...current, items: restoreItems(saved) }),
    },
  ),
);

let hydration: Promise<void> | undefined;

export function hydrateCart(): Promise<void> {
  // Called only from a client effect, once across all cart consumers.
  hydration ??= Promise.resolve(useCartStore.persist.rehydrate())
    .catch(() => { /* Corrupt storage must not prevent using the cart. */ })
    .then(() => { useCartStore.setState({ hydrated: true }); });
  return hydration;
}

export const selectTotalItems = (state: Pick<CartState, "items">): number =>
  state.items.reduce((total, item) => total + item.quantity, 0);

// Display only. Checkout/payment totals must later be recalculated on the server
// from trusted product prices and inventory, never from localStorage or this subtotal.
export const selectSubtotal = (state: Pick<CartState, "items">): number =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0);
