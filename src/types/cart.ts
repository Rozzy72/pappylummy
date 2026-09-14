import type { Product, JerseySize } from "@/types/product";

export type CartItem = Pick<Product, "slug" | "name" | "image" | "price"> & {
  productId: Product["id"];
  selectedSize: JerseySize;
  quantity: number;
};
