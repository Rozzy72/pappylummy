"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { normalizeProductId } from "@/lib/products/identity";
import { PRODUCT_ID_PERSISTENCE_VERSION, reconcileWishlist } from "./reconcile-persisted-items";

type WishlistState = {
  items: string[];
  hydrated: boolean;
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  toggleItem: (productId: string) => void;
  clearWishlist: () => void;
  isWishlisted: (productId: string) => boolean;
  totalWishlistItems: () => number;
};

// A blocked or full storage area should leave the in-memory wishlist usable.
const storage: StateStorage = {
  getItem: (name) => {
    try { return window.localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name, value) => {
    try { window.localStorage.setItem(name, value); } catch { /* Keep memory state. */ }
  },
  removeItem: (name) => {
    try { window.localStorage.removeItem(name); } catch { /* Storage may be unavailable. */ }
  },
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      addItem: (productId) => {
        const id = normalizeProductId(productId);
        if (!get().hydrated || !id || get().items.includes(id)) return;
        set((state) => ({ items: [...state.items, id] }));
      },
      removeItem: (productId) => {
        if (!get().hydrated) return;
        set((state) => ({ items: state.items.filter((id) => id !== normalizeProductId(productId)) }));
      },
      toggleItem: (productId) => {
        if (get().isWishlisted(productId)) get().removeItem(productId);
        else get().addItem(productId);
      },
      clearWishlist: () => {
        if (get().hydrated) set({ items: [] });
      },
      isWishlisted: (productId) => {
        const id = normalizeProductId(productId);
        return id !== undefined && get().items.includes(id);
      },
      totalWishlistItems: () => get().items.length,
    }),
    {
      name: "naija-kits-wishlist",
      version: PRODUCT_ID_PERSISTENCE_VERSION,
      migrate: (saved: unknown) => ({ items: reconcileWishlist(saved) }),
      storage: createJSONStorage(() => storage),
      skipHydration: true,
      // Persist IDs only: names, prices, images and URLs remain catalogue data.
      partialize: (state) => ({ items: state.items }),
      merge: (saved: unknown, current) => ({ ...current, items: reconcileWishlist(saved) }),
    },
  ),
);

let hydration: Promise<void> | undefined;

export function hydrateWishlist(): Promise<void> {
  hydration ??= Promise.resolve(useWishlistStore.persist.rehydrate())
    .catch(() => { /* Invalid JSON must not prevent using the wishlist. */ })
    .then(() => { useWishlistStore.setState({ hydrated: true }); });
  return hydration;
}
