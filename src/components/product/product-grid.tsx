import { Grid } from "@sd/ui";
import type { Product } from "@/types/product";
import { ProductCard } from "./product-card";
export function ProductGrid({ products }: { products: readonly Product[] }) {
  return (
    <Grid role="list">
      {products.map((product) => (
        <div role="listitem" key={product.id}>
          <ProductCard product={product} />
        </div>
      ))}
    </Grid>
  );
}
