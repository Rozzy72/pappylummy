import type { Product, JerseySize } from "@/types/product";

/** User selections only. Catalogue metadata must never be persisted here. */
export type CartItem = {
  productId: Product["id"];
  selectedSize: JerseySize;
  quantity: number;
};
