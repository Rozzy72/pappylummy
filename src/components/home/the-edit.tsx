import { Heading, Icon, LinkButton, Section, Stack, Text } from "@sd/ui";
import { ProductGrid } from "@/components/product/product-grid";
import { getProducts } from "@/lib/products/queries";
import type { Product } from "@/types/product";

// Editorial curation, not a popularity ranking. Keep the New Arrivals selection distinct.
export function selectEditorialProducts(products: readonly Product[]) {
  const arrivals = new Set(products.filter((product) => product.isNew).slice(0, 4).map((product) => product.id));
  const remaining = products.filter((product) => !arrivals.has(product.id));
  return [...remaining.filter((product) => product.isFeatured), ...remaining.filter((product) => !product.isFeatured)].slice(0, 3);
}

export async function TheEdit() {
  const products = selectEditorialProducts(await getProducts());
  if (!products.length) return null;
  return (
    <Section id="the-edit" spacing="editorial" aria-labelledby="edit-heading">
      <div id="edit-layout">
        <Stack gap="6">
          <Text look="eyebrow" muted>04 / CURATED PICKS</Text>
          <Heading id="edit-heading" look="display-lg">THE EDIT</Heading>
          <Text measure>A different angle on the collection. Selected jerseys for your next rotation.</Text>
          <div><LinkButton href="/shop" variant="text">Explore the collection <Icon name="arrow" /></LinkButton></div>
        </Stack>
        <ProductGrid products={products} />
      </div>
    </Section>
  );
}
