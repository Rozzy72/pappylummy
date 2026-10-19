import { PERSONALIZATION_PRICE } from "@/lib/personalization";
import {
  Stack,
  Box,
  Flex,
  ProductLayout,
  PersonalizationCard,
  LinkButton,
  Heading,
  Text,
  Badge,
  NavLink,
  Disclosure,
} from "@sd/ui";
import type { Metadata } from "next";
import { ProductActions } from "@/components/product/product-actions";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductGrid } from "@/components/product/product-grid";
import { WishlistButton } from "@/components/product/wishlist-button";
import { notFound } from "next/navigation";
import { getRelatedProducts } from "@/lib/products";
import { getProductBySlug, getProducts } from "@/lib/products/queries";
import { formatCurrency } from "@/utils/format-currency";
import { getTeam } from "@/utils/product-catalogue";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return {
    title: `${product.name} | PappyLummy`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const relatedProducts = getRelatedProducts(product, await getProducts());
  const isOnSale =
    product.originalPrice !== undefined &&
    product.originalPrice > product.price;

  return (
    <Stack gap="6">
      <NavLink href="/shop">← Back to the collection</NavLink>
      <ProductLayout>
        <ProductGallery product={product} />
        <Stack as="section" gap="5" aria-labelledby="product-heading">
          <Flex wrap>
            {product.isNew && <Badge>New</Badge>}
            {isOnSale && <Badge>Sale</Badge>}
            <Text look="eyebrow" muted>
              {getTeam(product)} / {product.season}
            </Text>
          </Flex>
          <Heading as="h1" id="product-heading">
            {product.name}
          </Heading>
          <Flex gap="3">
            <Text look="price">{formatCurrency(product.price)}</Text>
            {isOnSale && (
              <Text muted>
                <del>{formatCurrency(product.originalPrice!)}</del>
              </Text>
            )}
          </Flex>
          <Text look="small">
            {product.inStock
              ? "In stock · Choose your size below"
              : "Currently out of stock"}
          </Text>
          <Text muted>{product.description}</Text>
          <ProductActions key={product.id} product={product} />
          {product.inStock && (
            <PersonalizationCard>
              <Stack gap="3">

                <Text look="small" muted>
                  Preview the lettering before adding it to your jersey. Printing adds {formatCurrency(PERSONALIZATION_PRICE)}{" "}
                  per jersey.
                </Text>
                <LinkButton
                  href={`/customize?jersey=${product.slug}`}
                  fullWidth
                  variant="surface"
                >
                  Preview Customisation →
                </LinkButton>
              </Stack>
            </PersonalizationCard>
          )}
          <Flex>
            <WishlistButton
              productId={product.id}
              productName={product.name}
              showLabel
            />
          </Flex>
          <Disclosure title="The details">
            <Text muted>
              {product.league ?? "International collection"} · {product.season}{" "}
              · {product.category}. Current images are previews; final garment
              specifications will be confirmed before ordering opens.
            </Text>
          </Disclosure>
          <Disclosure title="Delivery & garment care">
            <Text muted>
              Ordering is not available yet. Delivery is ₦2,000 within Osun
              State or ₦5,000 elsewhere in Nigeria, per order. Follow the
              garment care label; wash gently inside out and avoid ironing
              printed details.
            </Text>
          </Disclosure>
          <NavLink href="/guide">Sizing & shopping information →</NavLink>
        </Stack>
      </ProductLayout>
      {relatedProducts.length > 0 && (
        <Box as="section" py="6">
          <Stack gap="6">
            <Heading>You May Also Like</Heading>
            <ProductGrid products={relatedProducts} />
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
