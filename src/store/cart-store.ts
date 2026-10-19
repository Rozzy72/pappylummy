"use client";

import {
  parsePersonalization,
  cartLineKey,
  type Personalization,
} from "@/lib/personalization";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { normalizeProductId } from "@/lib/products/identity";
import {
  MAX_CART_QUANTITY,
  CART_PERSISTENCE_VERSION,
  readPersistedSelections,
  reconcileCart,
  migrateCart,
  validQuantity,
} from "./reconcile-persisted-items";
import type { CartItem } from "@/types/cart";
import type { JerseySize, Product } from "@/types/product";

export { MAX_CART_QUANTITY } from "./reconcile-persisted-items";

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  addItem: (
    product: Product,
    selectedSize: JerseySize,
    quantity: number,
    personalization?: Personalization,
  ) => boolean;
  removeItem: (
    productId: string,
    selectedSize: JerseySize,
    personalization?: Personalization,
  ) => void;
  updateQuantity: (
    productId: string,
    selectedSize: JerseySize,
    quantity: number,
    personalization?: Personalization,
  ) => void;
  clearCart: () => void;
};

// Storage can be unavailable (privacy settings/quota); retain a usable memory cart.
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return readPersistedSelections(
        window.localStorage.getItem(name),
        CART_PERSISTENCE_VERSION,
      );
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* Memory cart remains usable. */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* Storage may be disabled. */
    }
  },
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      // Current adapted product is transient UI data, never checkout authority.
      addItem: (product, selectedSize, quantity, input) => {
        if (!get().hydrated || !validQuantity(quantity)) return false;
        const productId = normalizeProductId(product.id);
        if (
          !productId ||
          !product.inStock ||
          !product.sizes.includes(selectedSize)
        )
          return false;
        const personalization =
          input === undefined ? undefined : parsePersonalization(input);
        if (input !== undefined && !personalization) return false;
        const candidate = {
          productId,
          selectedSize,
          quantity,
          ...(personalization ? { personalization } : {}),
        };
        const allocated = get()
          .items.filter(
            (item) =>
              item.productId === productId &&
              item.selectedSize === selectedSize,
          )
          .reduce((sum, item) => sum + item.quantity, 0);
        if (allocated + quantity > MAX_CART_QUANTITY) return false;
        const key = cartLineKey(candidate);
        const existing = get().items.some((item) => cartLineKey(item) === key);
        set((state) => ({
          items: existing
            ? state.items.map((item) =>
                cartLineKey(item) === key
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              )
            : [...state.items, candidate],
        }));
        return true;
      },
      removeItem: (rawId, selectedSize, personalization) => {
        if (!get().hydrated) return;
        const productId = normalizeProductId(rawId);
        if (!productId) return;
        const key = cartLineKey({ productId, selectedSize, personalization });
        set((state) => ({
          items: state.items.filter((item) => cartLineKey(item) !== key),
        }));
      },
      updateQuantity: (rawId, selectedSize, quantity, personalization) => {
        if (!get().hydrated || !validQuantity(quantity)) return;
        const productId = normalizeProductId(rawId);
        if (!productId) return;
        const key = cartLineKey({ productId, selectedSize, personalization });
        const others = get()
          .items.filter(
            (item) =>
              item.productId === productId &&
              item.selectedSize === selectedSize &&
              cartLineKey(item) !== key,
          )
          .reduce((sum, item) => sum + item.quantity, 0);
        if (others + quantity > MAX_CART_QUANTITY) return;
        set((state) => ({
          items: state.items.map((item) =>
            cartLineKey(item) === key ? { ...item, quantity } : item,
          ),
        }));
      },
      clearCart: () => {
        if (get().hydrated) set({ items: [] });
      },
    }),
    {
      name: "naija-kits-cart",
      version: CART_PERSISTENCE_VERSION,
      migrate: migrateCart,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: (state) => ({ items: reconcileCart({ items: state.items }) }),
      merge: (saved: unknown, current) => ({
        ...current,
        items: reconcileCart(saved),
      }),
    },
  ),
);

let hydration: Promise<void> | undefined;

export function hydrateCart(): Promise<void> {
  // Called only from a client effect, once across all cart consumers.
  hydration ??= Promise.resolve(useCartStore.persist.rehydrate())
    .catch(() => {
      /* Corrupt storage must not prevent using the cart. */
    })
    .then(() => {
      useCartStore.setState({ hydrated: true });
    });
  return hydration;
}

export const selectTotalItems = (state: Pick<CartState, "items">): number =>
  state.items.reduce((total, item) => total + item.quantity, 0);
