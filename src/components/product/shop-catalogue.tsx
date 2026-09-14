"use client";

import { useId, useMemo, useState } from "react";
import { ProductGrid } from "@/components/product/product-grid";
import type { JerseySize, Product } from "@/types/product";
import {
  filterAndSortProducts,
  getTeam,
  sortOptions,
  type CatalogueFilters,
  type SortOption,
} from "@/utils/product-catalogue";

const emptyFilters: CatalogueFilters = { club: "", league: "", category: "", size: "" };
const sizeOrder: readonly JerseySize[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const controlStyle = "min-h-11 w-full min-w-0 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: readonly T[];
  onChange: (value: T | "") => void;
}) {
  const id = useId();

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(options.find((option) => option === event.target.value) ?? "")}
        className={controlStyle}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ShopCatalogue({ products }: { products: readonly Product[] }) {
  const [filters, setFilters] = useState<CatalogueFilters>(emptyFilters);
  const [sortOption, setSortOption] = useState<SortOption>("featured");
  const sortId = useId();

  const options = useMemo(() => ({
    clubs: [...new Set(products.map(getTeam).filter(Boolean))].sort(),
    leagues: [...new Set(products.flatMap((product) => product.league ? [product.league] : []))].sort(),
    categories: [...new Set(products.map((product) => product.category))].sort(),
    sizes: sizeOrder.filter((size) => products.some((product) => product.sizes.includes(size))),
  }), [products]);

  const results = useMemo(
    () => filterAndSortProducts(products, filters, sortOption),
    [products, filters, sortOption],
  );
  const hasFilters = Object.values(filters).some(Boolean);

  function updateFilter<K extends keyof CatalogueFilters>(key: K, value: CatalogueFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section aria-labelledby="catalogue-heading" className="mt-8">
      <h2 id="catalogue-heading" className="sr-only">Jersey catalogue</h2>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" aria-atomic="true" className="text-sm font-medium text-neutral-600">
          {results.length} {results.length === 1 ? "Product" : "Products"}
        </p>
        <div className="flex items-center gap-3">
          <label htmlFor={sortId} className="shrink-0 text-sm font-medium">Sort by</label>
          <select
            id={sortId}
            value={sortOption}
            onChange={(event) => {
              const option = sortOptions.find((item) => item.value === event.target.value);
              if (option) setSortOption(option.value);
            }}
            className={controlStyle + " sm:w-52"}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside aria-label="Product filters" className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <fieldset>
            <legend className="mb-4 text-base font-semibold">Filters</legend>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <FilterSelect label="Club / Team" value={filters.club} options={options.clubs} onChange={(value) => updateFilter("club", value)} />
              <FilterSelect label="League" value={filters.league} options={options.leagues} onChange={(value) => updateFilter("league", value)} />
              <FilterSelect label="Category" value={filters.category} options={options.categories} onChange={(value) => updateFilter("category", value)} />
              <FilterSelect label="Size" value={filters.size} options={options.sizes} onChange={(value) => updateFilter("size", value)} />
            </div>
          </fieldset>
          <button type="button" onClick={() => setFilters(emptyFilters)} disabled={!hasFilters} className="mt-4 min-h-11 rounded-md text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:text-neutral-500 disabled:no-underline">
            Clear Filters
          </button>
        </aside>
        <div className="min-w-0">
          {results.length > 0 ? (
            <ProductGrid products={results} />
          ) : (
            <div className="rounded-xl border border-neutral-200 px-6 py-16 text-center">
              <h3 className="text-lg font-semibold">No jerseys match your current filters.</h3>
              <p className="mt-2 text-sm text-neutral-600">Try another combination or browse the full collection.</p>
              <button type="button" onClick={() => setFilters(emptyFilters)} className="mt-6 min-h-11 rounded-md bg-neutral-950 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4">
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
