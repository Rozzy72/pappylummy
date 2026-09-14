import type { JerseySize, Product, ProductCategory } from "@/types/product";

export type CatalogueFilters = {
  club: string;
  league: string;
  category: ProductCategory | "";
  size: JerseySize | "";
};

export const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A-Z" },
] as const;

export type SortOption = (typeof sortOptions)[number]["value"];

export function getTeam(product: Product): string {
  return product.club ?? product.country ?? "";
}

export function filterAndSortProducts(
  products: readonly Product[],
  filters: CatalogueFilters,
  sort: SortOption,
): Product[] {
  const results = products.filter(
    (product) =>
      (!filters.club || getTeam(product) === filters.club) &&
      (!filters.league || product.league === filters.league) &&
      (!filters.category || product.category === filters.category) &&
      (!filters.size || product.sizes.includes(filters.size)),
  );

  // filter creates a fresh array, so sorting never mutates the source catalogue.
  return results.sort((a, b) => {
    switch (sort) {
      case "featured":
        return Number(b.isFeatured) - Number(a.isFeatured);
      case "newest":
        // No arrival timestamp exists yet: new items first, then latest season.
        return Number(b.isNew) - Number(a.isNew) ||
          b.season.localeCompare(a.season, "en", { numeric: true });
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "name":
        return a.name.localeCompare(b.name, "en");
    }
  });
}
