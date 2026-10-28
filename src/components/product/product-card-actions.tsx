import { CardShopping, LinkButton, Text } from "@sd/ui";
import type { Product } from "@/types/product";

/** Size and personalization choices belong to the product detail page. */
export function ProductCardActions({ product }: { product: Product }) {
  const available = product.inStock && product.sizes.length > 0;
  return (
    <CardShopping>
      {available ? (
        <LinkButton fullWidth size="1" href={`/product/${encodeURIComponent(product.slug)}`} aria-label={`Choose options for ${product.name}`}>
          Choose options
        </LinkButton>
      ) : <Text look="small" muted>{product.inStock ? "No sizes available" : "Out of stock"}</Text>}
    </CardShopping>
  );
}
