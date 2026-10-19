import Link from "next/link";
import {
  Card,
  ImageFrame,
  CardOverlay,
  Badge,
  Stack,
  Price,
  Text,
  NavLink,
} from "@sd/ui";
import { ProductCardActions } from "./product-card-actions";
import { ProductImage } from "./product-image";
import { WishlistButton } from "./wishlist-button";
import type { Product } from "@/types/product";
import { formatCurrency } from "@/utils/format-currency";
export function ProductCard({ product }: { product: Product }) {
  const href = `/product/${encodeURIComponent(product.slug)}`;
  const sale =
    product.originalPrice !== undefined &&
    product.originalPrice > product.price;
  return (
    <Card>
      <ImageFrame>
        <Link href={href} aria-label={`View ${product.name}`}>
          <ProductImage
            reference={product.image}
            productId={product.id}
            alt={product.name}
            fill
            sizes="(min-width:1280px) 288px, (min-width:768px) 30vw, 45vw"
          />
        </Link>
        <CardOverlay>
          {product.isNew && <Badge variant="new">New</Badge>}
          {sale && <Badge variant="sale">Sale</Badge>}
        </CardOverlay>
        <CardOverlay side="right">
          <WishlistButton productId={product.id} productName={product.name} />
        </CardOverlay>
      </ImageFrame>
      <Stack gap="1">
        <Text look="eyebrow" muted>
          {product.club ?? product.country ?? "The collection"}
        </Text>
        <h3>
          <NavLink href={href}>{product.name}</NavLink>
        </h3>
        <Price current={formatCurrency(product.price)} original={sale ? formatCurrency(product.originalPrice!) : undefined} />
        <ProductCardActions product={product} />
        {!product.inStock && <Text look="small" muted>Currently out of stock</Text>}
      </Stack>
    </Card>
  );
}
