"use client";

import {
  Stack,
  Box,
  Flex,
  Grid,
  Text,
  Heading,
  Button,
  FieldLabel,
  Select,
  Disclosure,
} from "@sd/ui";
import { useEffect, useId, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { changeShopQuery, readShopQuery, shopFilterSummary } from "@/utils/shop-query";
import { ProductGrid } from "@/components/product/product-grid";
import type { JerseySize, Product } from "@/types/product";
import {
  filterAndSortProducts,
  getTeam,
  sortOptions,
  type CatalogueFilters,
} from "@/utils/product-catalogue";

const sizeOrder: readonly JerseySize[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
];

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
    <Stack gap="2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(
            options.find((option) => option === event.target.value) ?? "",
          )
        }
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </Select>
    </Stack>
  );
}

export function ShopCatalogue({
  products,
}: {
  products: readonly Product[];
}) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const state = useMemo(() => readShopQuery(query, products), [query, products]);
  const { filters, sort: sortOption, conflicts, canonical } = state;
  const summary = shopFilterSummary(filters);
  // Next.js supports history integration with useSearchParams without an RSC refetch.
  // Normalization replaces; explicit user selections push one recoverable entry.
  useEffect(() => {
    if (!conflicts.length && query !== canonical && window.location.search.slice(1) === query) {
      window.history.replaceState(null, "", `${pathname}${canonical ? `?${canonical}` : ""}${window.location.hash}`);
    }
  }, [query, canonical, conflicts, pathname]);

  function navigate(key: keyof CatalogueFilters | "sort" | "clear", value = "") {
    // Read the current URL so fast consecutive changes never use a stale render.
    const next = readShopQuery(changeShopQuery(window.location.search, key, value), products);
    const target = next.conflicts.length ? changeShopQuery(window.location.search, key, value) : next.canonical;
    if (target !== window.location.search.slice(1)) {
      window.history.pushState(null, "", `${pathname}${target ? `?${target}` : ""}${window.location.hash}`);
    }
  }
  const sortId = useId();

  const options = useMemo(
    () => ({
      clubs: [...new Set(products.map(getTeam).filter(Boolean))].sort(),
      leagues: [
        ...new Set(
          products.flatMap((product) =>
            product.league ? [product.league] : [],
          ),
        ),
      ].sort(),
      categories: [
        ...new Set(products.map((product) => product.category)),
      ].sort(),
      sizes: sizeOrder.filter((size) =>
        products.some((product) => product.sizes.includes(size)),
      ),
    }),
    [products],
  );

  const results = useMemo(
    () => conflicts.length ? [] : filterAndSortProducts(products, filters, sortOption),
    [products, filters, sortOption, conflicts],
  );
  const hasFilters = summary.length > 0 || conflicts.length > 0;

  function updateFilter<K extends keyof CatalogueFilters>(
    key: K,
    value: CatalogueFilters[K],
  ) {
    navigate(key, value);
  }

  return (
    <Stack as="section" gap="6" aria-label="Jersey catalogue">
      <Flex justify="between" wrap>
        <Text role="status" aria-atomic="true" look="small">
          {results.length} {results.length === 1 ? "jersey" : "jerseys"} in the
          collection
        </Text>
        <Flex gap="3">
          <FieldLabel htmlFor={sortId} nowrap>Sort by</FieldLabel>
          <Select
            id={sortId}
            value={sortOption}
            onChange={(e) => {
              const option = sortOptions.find(
                (o) => o.value === e.target.value,
              );
              if (option) navigate("sort", option.value);
            }}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Flex>
      </Flex>
      <Disclosure
        title={
          hasFilters
            ? `Filter collection · ${Object.values(filters).filter(Boolean).length} active`
            : "Filter collection · Team, league, style & size"
        }
      >
        <Stack>
          <Grid layout="filters">
            <FilterSelect
              label="Team type"
              value={filters.teamType ?? ""}
              options={["national"] as const}
              onChange={(v) => updateFilter("teamType", v)}
            />
            <FilterSelect
              label="Club / Team"
              value={filters.club}
              options={options.clubs}
              onChange={(v) => updateFilter("club", v)}
            />
            <FilterSelect
              label="League"
              value={filters.league}
              options={options.leagues}
              onChange={(v) => updateFilter("league", v)}
            />
            <FilterSelect
              label="Category"
              value={filters.category}
              options={options.categories}
              onChange={(v) => updateFilter("category", v)}
            />
            <FilterSelect
              label="Size"
              value={filters.size}
              options={options.sizes}
              onChange={(v) => updateFilter("size", v)}
            />
          </Grid>
          <Flex>
            <Button
              variant="link"
              disabled={!hasFilters}
              onClick={() => navigate("clear")}
            >
              Clear Filters
            </Button>
          </Flex>
        </Stack>
      </Disclosure>
      {summary.length > 0 && <Text look="small">Active filters ({summary.length}): {summary.join(" · ")}</Text>}
      {conflicts.length > 0 && <Text role="alert">This link contains conflicting filters. Choose a single value or clear filters to continue.</Text>}
      {results.length ? (
        <ProductGrid products={results} />
      ) : (
        <Box surface="paper" p="9" border>
          <Stack>
            <Heading as="h2">No jerseys match these filters.</Heading>
            <Text muted>Try another combination to find your colours.</Text>
            <Flex>
              <Button onClick={() => navigate("clear")}>
                Clear Filters
              </Button>
            </Flex>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
