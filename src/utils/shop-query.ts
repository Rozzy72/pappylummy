import type { Product } from "@/types/product";
import { getTeam, sortOptions, type CatalogueFilters, type SortOption } from "./product-catalogue";

export const filterKeys = ["teamType", "club", "league", "category", "size"] as const;
export const emptyShopFilters: CatalogueFilters = { teamType: "", club: "", league: "", category: "", size: "" };

/** Unknown values are ignored independently; conflicting duplicates fail closed. */
export function readShopQuery(query: string, products: readonly Product[]) {
  const params = new URLSearchParams(query);
  const filters = { ...emptyShopFilters };
  const allowed = {
    teamType: ["national"],
    club: products.map(getTeam),
    league: products.flatMap(p => p.league ? [p.league] : []),
    category: products.map(p => p.category),
    size: products.flatMap(p => p.sizes),
  };
  const conflicts: string[] = [];
  for (const key of filterKeys) {
    const values = [...new Set(params.getAll(key))];
    if (values.length > 1) conflicts.push(key);
    const value = values[0];
    if (values.length === 1 && value && (allowed[key] as readonly string[]).includes(value)) {
      Object.assign(filters, { [key]: value });
    }
  }
  const sorts = [...new Set(params.getAll("sort"))];
  const sort: SortOption = sorts.length === 1
    ? sortOptions.find(o => o.value === sorts[0])?.value ?? "featured"
    : "featured";
  return { filters, sort, conflicts, canonical: writeShopQuery(filters, sort) };
}

export function writeShopQuery(filters: CatalogueFilters, sort: SortOption) {
  const params = new URLSearchParams();
  for (const key of filterKeys) if (filters[key]) params.set(key, filters[key]);
  if (sort !== "featured") params.set("sort", sort);
  return params.toString();
}

/** Preserve other parameters, including unresolved conflicts, until validated. */
export function changeShopQuery(query: string, key: typeof filterKeys[number] | "sort" | "clear", value = "") {
  const params = new URLSearchParams(query);
  if (key === "clear") filterKeys.forEach(k => params.delete(k));
  else if (!value || (key === "sort" && value === "featured")) params.delete(key);
  else params.set(key, value);
  return params.toString();
}

export function shopFilterSummary(filters: CatalogueFilters) {
  return filterKeys.flatMap(key => {
    const value = filters[key];
    if (!value) return [];
    return [key === "teamType" ? "National Teams" : key === "size" ? `Size ${value}` : key === "category" ? value.charAt(0).toUpperCase() + value.slice(1) : value];
  });
}
