import { notFound } from "next/navigation";
import { products } from "@/data/products";
import type { Product } from "@/types/product";
import { getTeam } from "@/utils/product-catalogue";

export function getProductBySlug(slug: string): Product {
  // Route input is used only for an exact match against the local catalogue.
  const product = products.find((candidate) => candidate.slug === slug);
  if (!product) notFound();
  return product;
}

export function getRelatedProducts(product: Product): Product[] {
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
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((candidate) => candidate.product);
}
