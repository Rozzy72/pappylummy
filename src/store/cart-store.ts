"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { normalizeProductId } from "@/lib/products/identity";
import { MAX_CART_QUANTITY, PRODUCT_ID_PERSISTENCE_VERSION, readPersistedSelections, reconcileCart, migrateCart, validQuantity } from "./reconcile-persisted-items";
import type { CartItem } from "@/types/cart";
import type { JerseySize, Product } from "@/types/product";

export { MAX_CART_QUANTITY } from "./reconcile-persisted-items";

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  addItem: (product: Product, selectedSize: JerseySize, quantity: number) => boolean;
  removeItem: (productId: string, selectedSize: JerseySize) => void;
  updateQuantity: (productId: string, selectedSize: JerseySize, quantity: number) => void;
  clearCart: () => void;
};

// Storage can be unavailable (privacy settings/quota); retain a usable memory cart.
const safeStorage: StateStorage = {
  getItem: (name) => {
    try { return readPersistedSelections(window.localStorage.getItem(name)); } catch { return null; }
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
      // Current adapted product is transient UI data, never checkout authority.
      addItem: (product, selectedSize, quantity) => {
        if (!get().hydrated || !validQuantity(quantity)) return false;
        const productId = normalizeProductId(product.id);
        if (!productId || !product.inStock || !product.sizes.includes(selectedSize)) return false;
        const existing = get().items.find((item) => item.productId === normalizeProductId(productId) && item.selectedSize === selectedSize);
        if ((existing?.quantity ?? 0) + quantity > MAX_CART_QUANTITY) return false;
        set((state) => ({
          items: existing
            ? state.items.map((item) => item.productId === normalizeProductId(productId) && item.selectedSize === selectedSize
              ? { ...item, quantity: item.quantity + quantity } : item)
            : [...state.items, {
              productId, selectedSize, quantity,
            }],
        }));
        return true;
      },
      removeItem: (productId, selectedSize) => {
        if (!get().hydrated) return;
        set((state) => ({ items: state.items.filter((item) => item.productId !== normalizeProductId(productId) || item.selectedSize !== selectedSize) }));
      },
      updateQuantity: (productId, selectedSize, quantity) => {
        if (!get().hydrated || !validQuantity(quantity)) return;
        set((state) => ({ items: state.items.map((item) => item.productId === normalizeProductId(productId) && item.selectedSize === selectedSize ? { ...item, quantity } : item) }));
      },
      clearCart: () => { if (get().hydrated) set({ items: [] }); },
    }),
    {
      name: "naija-kits-cart",
      version: PRODUCT_ID_PERSISTENCE_VERSION,
      migrate: migrateCart,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: (state) => ({ items: reconcileCart({ items: state.items }) }),
      merge: (saved: unknown, current) => ({ ...current, items: reconcileCart(saved) }),
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
