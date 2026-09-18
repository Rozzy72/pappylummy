import { getProductGallery } from "@/utils/product-image";
import type { ProductRow } from "@/types/database";
import type { JerseySize, Product, ProductCategory } from "@/types/product";

const categories = {
  home: true, away: true, third: true, goalkeeper: true,
  training: true, retro: true, player: true, international: true,
} satisfies Record<ProductCategory, boolean>;
const sizes = {
  XS: true, S: true, M: true, L: true, XL: true, "2XL": true, "3XL": true, "4XL": true,
} satisfies Record<JerseySize, boolean>;

function isCategory(value: unknown): value is ProductCategory {
  return typeof value === "string" && Object.hasOwn(categories, value);
}
function isSize(value: unknown): value is JerseySize {
  return typeof value === "string" && Object.hasOwn(sizes, value);
}

export function isProductSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

/** Display conversion only. Future checkout must use trusted server-side integer kobo. */
export function koboToNaira(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid product money: expected a nonnegative safe integer in kobo.");
  }
  return value / 100;
}

export function productRowToProduct(row: ProductRow): Product {
  if (!isProductSlug(row.slug)) throw new Error("Invalid product slug.");
  if (!isCategory(row.category)) throw new Error("Invalid product category.");
  if (!Array.isArray(row.sizes)) throw new Error("Invalid product sizes.");
  const validatedSizes = row.sizes.map((size) => {
    if (!isSize(size)) throw new Error("Invalid product size.");
    return size;
  });
  if (row.currency !== "NGN") throw new Error("Invalid product currency.");
  const price = koboToNaira(row.price_kobo);
  const originalPrice = row.original_price_kobo === null
    ? undefined : koboToNaira(row.original_price_kobo);
  if (row.original_price_kobo !== null && row.original_price_kobo <= row.price_kobo) {
    throw new Error("Invalid product original price: must exceed current price.");
  }
  const [image, ...images] = getProductGallery(row.image_path, row.images, row.id);
  return {
    id: row.id, name: row.name, slug: row.slug, description: row.description,
    price, originalPrice,
    image, images,
    club: row.club ?? undefined, league: row.league ?? undefined, country: row.country ?? undefined,
    category: row.category, season: row.season, sizes: validatedSizes,
    isNew: row.is_new, isFeatured: row.is_featured,
    isBestSeller: row.is_best_seller, inStock: row.in_stock,
  };
}
