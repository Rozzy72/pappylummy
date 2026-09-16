import type { Product } from "@/types/product";
import { getTeam } from "@/utils/product-catalogue";

export function getRelatedProducts(product: Product, products: readonly Product[]): Product[] {
  const team = getTeam(product);
  return products
    .filter((candidate) => candidate.id !== product.id)
    .map((candidate) => ({
      product: candidate,
      score:
        (team && getTeam(candidate) === team ? 4 : 0) +
        (product.league && candidate.league === product.league ? 2 : 0) +
        (candidate.category === product.category ? 1 : 0),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.product.slug.localeCompare(b.product.slug, "en"))
    .slice(0, 4)
    .map((candidate) => candidate.product);
}
