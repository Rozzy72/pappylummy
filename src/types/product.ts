export type JerseySize = "XS" | "S" | "M" | "L" | "XL" | "2XL" | "3XL" | "4XL";

export type ProductCategory =
  | "home"
  | "away"
  | "third"
  | "goalkeeper"
  | "training"
  | "retro"
  | "player"
  | "international";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Amount in Nigerian Naira (NGN), not kobo. */
  price: number;
  /** Previous price in Nigerian Naira (NGN), when discounted. */
  originalPrice?: number;
  /** Primary image URL or public asset path. */
  image: string;
  /** Additional image URLs or public asset paths. */
  images: string[];
  /** Optional for national team jerseys. */
  club?: string;
  /** Optional for national team jerseys. */
  league?: string;
  /** Club country or represented nation for international jerseys. */
  country?: string;
  category: ProductCategory;
  /** Season label, e.g. "2026/27" or "1994". */
  season: string;
  sizes: JerseySize[];
  isNew: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  inStock: boolean;
}
