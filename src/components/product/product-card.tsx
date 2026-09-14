import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { formatCurrency } from "@/utils/format-currency";
import { getProductImage, productPlaceholder } from "@/utils/product-image";
import { WishlistButton } from "@/components/product/wishlist-button";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  // Catalogue slugs are trusted data; encode them as a single path segment.
  const productUrl = `/product/${encodeURIComponent(product.slug)}`;
  const isOnSale =
    product.originalPrice !== undefined && product.originalPrice > product.price;
  const imageSrc = getProductImage(product.image);
  const isPlaceholder = imageSrc === productPlaceholder;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="relative bg-neutral-100">
        <Link
          href={productUrl}
          aria-label={`View ${product.name}`}
          className="relative block aspect-[4/5] focus-visible:outline-2 focus-visible:-outline-offset-2"
        >
          <Image
            src={imageSrc}
            alt={isPlaceholder ? "Jersey placeholder; product photography coming soon" : product.name}
            fill
            sizes="(min-width: 1280px) 288px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-contain p-3 sm:p-5"
          />
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1 pr-12 sm:left-3 sm:top-3">
          {product.isNew && (
            <span className="rounded bg-neutral-950 px-2 py-1 text-xs font-medium text-white">
              New
            </span>
          )}
          {isOnSale && (
            <span className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs font-medium">
              Sale
            </span>
          )}
        </div>
        <WishlistButton productId={product.id} productName={product.name} className="absolute right-2 top-2 sm:right-3 sm:top-3" />
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-xs text-neutral-600">{product.club ?? product.country ?? "Football jersey"}</p>
        <h3 className="mt-1 text-sm font-semibold leading-6 sm:text-base">
          <Link href={productUrl} className="rounded-sm hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
            {product.name}
          </Link>
        </h3>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-semibold">
            <span className="sr-only">Price: </span>
            {formatCurrency(product.price)}
          </span>
          {isOnSale && product.originalPrice !== undefined && (
            <span className="text-xs text-neutral-500">
              <span className="sr-only">Original price: </span>
              <del>{formatCurrency(product.originalPrice)}</del>
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-neutral-600">
          {product.inStock ? "In stock" : "Out of stock"}
        </p>
        <div className="mt-auto pt-4">
          {product.inStock ? (
            <Link href={productUrl} aria-label={`Select size for ${product.name}`} className="flex min-h-11 w-full items-center justify-center rounded-md border border-neutral-300 bg-neutral-100 px-2 py-2 text-sm font-medium hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2">
              Select options
            </Link>
          ) : (
            <button type="button" disabled className="min-h-11 w-full cursor-not-allowed rounded-md border border-neutral-300 bg-neutral-100 px-2 py-2 text-sm font-medium text-neutral-600">
              Out of stock
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
