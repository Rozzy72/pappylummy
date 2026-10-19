import { Section, Stack, SectionHeader, LinkButton, Icon } from "@sd/ui";
import { ProductGrid } from "@/components/product/product-grid";
import { getProducts } from "@/lib/products/queries";
export async function NewArrivals() {
  const products = await getProducts();
  return (
    <Section id="new-arrivals" spacing="editorial" aria-labelledby="new-arrivals-heading">
      <Stack gap="6">
        <SectionHeader
          id="new-arrivals-heading"
          description="Top picks from our collection."
          title="Featured Jerseys"
          action={<LinkButton href="/shop" variant="text">View all <Icon name="arrow" /></LinkButton>}
        />
        <ProductGrid products={[...products.filter((p) => p.isNew),...products.filter(p=>!p.isNew)].slice(0,5)} />
      </Stack>
    </Section>
  );
}
