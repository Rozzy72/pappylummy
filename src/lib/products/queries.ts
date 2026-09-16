import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isProductSlug, productRowToProduct } from "./adapter";
import type { Product } from "@/types/product";

/** Unique slug ascending is deterministic; this does not preserve static array order. */
export const getProducts = cache(async (): Promise<Product[]> => {
  const client = await createClient();
  const { data, error } = await client.from("products").select("*")
    .eq("is_active", true).order("slug", { ascending: true });
  if (error) throw new Error("Unable to load products.");
  return data.map(productRowToProduct);
});

/** Invalid or missing slugs return null; API errors remain distinct from not-found. */
export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  if (!isProductSlug(slug)) return null;
  const client = await createClient();
  const { data, error } = await client.from("products").select("*")
    .eq("is_active", true).eq("slug", slug)
    .order("slug", { ascending: true }).maybeSingle();
  if (error) throw new Error("Unable to load product.");
  return data ? productRowToProduct(data) : null;
});
