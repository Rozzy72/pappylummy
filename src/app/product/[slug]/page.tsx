import type { Metadata } from "next";
import { ProductActions } from "@/components/product/product-actions";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductGrid } from "@/components/product/product-grid";
import { WishlistButton } from "@/components/product/wishlist-button";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import { formatCurrency } from "@/utils/format-currency";
import { getTeam } from "@/utils/product-catalogue";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return {
    title: `${product.name} | Naija Kits`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  const relatedProducts = getRelatedProducts(product);
  const isOnSale = product.originalPrice !== undefined && product.originalPrice > product.price;

  return (
    <>
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery product={product} />
        <section aria-labelledby="product-heading">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            {product.isNew && <span className="rounded bg-neutral-950 px-2 py-1 text-white">New</span>}
            {isOnSale && <span className="rounded border border-neutral-300 px-2 py-1">Sale</span>}
          </div>
          <h1 id="product-heading" className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-neutral-600">Club / Team</dt><dd className="mt-1 font-medium">{getTeam(product) || "Football jersey"}</dd></div>
            {product.league && <div><dt className="text-neutral-600">League</dt><dd className="mt-1 font-medium">{product.league}</dd></div>}
            <div><dt className="text-neutral-600">Season</dt><dd className="mt-1 font-medium">{product.season}</dd></div>
            <div><dt className="text-neutral-600">Category</dt><dd className="mt-1 font-medium capitalize">{product.category}</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="text-2xl font-semibold"><span className="sr-only">Current price: </span>{formatCurrency(product.price)}</span>
            {isOnSale && product.originalPrice !== undefined && (
              <span className="text-base text-neutral-600"><span className="sr-only">Original price: </span><del>{formatCurrency(product.originalPrice)}</del></span>
            )}
          </div>
          <p className="mt-3 text-sm font-medium">{product.inStock ? "In stock" : "Out of stock"}</p>
          <p className="mt-5 text-base leading-7 text-neutral-600">{product.description}</p>
          <ProductActions key={product.id} productId={product.id} sizes={product.sizes} inStock={product.inStock} />
          <WishlistButton productId={product.id} productName={product.name} showLabel className="mt-4" />
        </section>
      </div>
      <section aria-labelledby="details-heading" className="mt-12 border-t border-neutral-200 py-10">
        <h2 id="details-heading" className="text-2xl font-semibold tracking-tight">Product Details</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold">The jersey</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">Review the season, category and available sizes above before choosing your jersey. Current images are placeholders.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Delivery</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">Nationwide Nigerian delivery options and charges will be shown during checkout when ordering becomes available.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Care information</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">Follow the garment care label. Wash gently inside out and avoid ironing directly over printed details.</p>
          </div>
        </div>
      </section>
      {relatedProducts.length > 0 && (
        <section aria-labelledby="related-heading" className="py-6">
          <h2 id="related-heading" className="mb-6 text-2xl font-semibold tracking-tight">Related Jerseys</h2>
          <ProductGrid products={relatedProducts} />
        </section>
      )}
    </>
  );
}
