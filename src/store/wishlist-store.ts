"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { products } from "@/data/products";

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

const knownIds = new Set(products.map((product) => product.id));

function restoreItems(saved: unknown): string[] {
  if (typeof saved !== "object" || saved === null || !("items" in saved) || !Array.isArray(saved.items)) return [];
  return [...new Set(saved.items.filter(
    (id: unknown): id is string => typeof id === "string" && knownIds.has(id),
  ))];
}

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
        if (!get().hydrated || !knownIds.has(productId) || get().items.includes(productId)) return;
        set((state) => ({ items: [...state.items, productId] }));
      },
      removeItem: (productId) => {
        if (!get().hydrated) return;
        set((state) => ({ items: state.items.filter((id) => id !== productId) }));
      },
      toggleItem: (productId) => {
        if (get().isWishlisted(productId)) get().removeItem(productId);
        else get().addItem(productId);
      },
      clearWishlist: () => {
        if (get().hydrated) set({ items: [] });
      },
      isWishlisted: (productId) => get().items.includes(productId),
      totalWishlistItems: () => get().items.length,
    }),
    {
      name: "naija-kits-wishlist",
      version: 1,
      storage: createJSONStorage(() => storage),
      skipHydration: true,
      // Persist IDs only: names, prices, images and URLs remain catalogue data.
      partialize: (state) => ({ items: state.items }),
      merge: (saved: unknown, current) => ({ ...current, items: restoreItems(saved) }),
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
