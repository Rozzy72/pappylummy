import { jerseyUnitPrice } from "@/lib/personalization";
import type { CartItem } from "@/types/cart";
import type { Product } from "@/types/product";

export type CartSelection = {
  item: CartItem;
  product?: Product;
  status: "available" | "missing" | "size-unavailable" | "out-of-stock" | "unverified";
};

/** A null snapshot is a failed read, never an empty catalogue. Does not alter selections. */
export function selectCart(items: readonly CartItem[], products: readonly Product[] | null): CartSelection[] {
  const catalogue = new Map(products?.map((product) => [product.id, product]));
  return items.map((item) => {
    const product = catalogue.get(item.productId);
    const status = products === null ? "unverified" : !product ? "missing"
      : !product.inStock ? "out-of-stock" : !product.sizes.includes(item.selectedSize)
        ? "size-unavailable" : "available";
    return { item, product, status };
  });
}

// Display only. Future checkout must reload prices/stock/sizes on the server and
// calculate trusted totals there; neither localStorage nor this snapshot authorizes payment.
export function availableSubtotal(lines: readonly CartSelection[]): number {
  return lines.reduce((total, line) => total + (line.status === "available" && line.product
    ? jerseyUnitPrice(line.product.price, Boolean(line.item.personalization)) * line.item.quantity : 0), 0);
}

export function selectWishlist(ids: readonly string[], products: readonly Product[]): { products: Product[]; unavailableIds: string[] } {
  const catalogue = new Map(products.map((product) => [product.id, product]));
  const saved: Product[] = [];
  const unavailableIds: string[] = [];
  for (const id of ids) {
    const product = catalogue.get(id);
    if (product) saved.push(product);
    else unavailableIds.push(id);
  }
  return { products: saved, unavailableIds };
}
