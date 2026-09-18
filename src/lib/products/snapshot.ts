import "server-only";
import { getProducts } from "./queries";
import type { Product } from "@/types/product";

/** Preserve failure separately from a successful empty result; never use static data. */
export async function getCatalogueSnapshot(): Promise<Product[] | null> {
  try { return await getProducts(); }
  catch { return null; }
}
