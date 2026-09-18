import { ProductImage } from "@/components/product/product-image";
import type { Product } from "@/types/product";
import { getProductGallery, productPlaceholder } from "@/utils/product-image";

type ProductGalleryProps = {
  product: Pick<Product, "id" | "name" | "image" | "images">;
};

export function ProductGallery({ product }: ProductGalleryProps) {
  const images = getProductGallery(product.image, product.images, product.id);

  return (
    <section aria-label={`Images of ${product.name}`} className="space-y-4">
      {images.map((src, index) => (
        <figure key={src} className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
          <div className="relative aspect-[4/5]">
            <ProductImage
              reference={src}
              productId={product.id}
              alt={src === productPlaceholder
                ? `Placeholder for ${product.name}; product photography coming soon`
                : `${product.name}, view ${index + 1}`}
              fill
              sizes="(min-width: 1280px) 576px, (min-width: 1024px) 50vw, 100vw"
              className="object-contain p-6"
            />
          </div>
          {src === productPlaceholder && (
            <figcaption className="px-4 pb-4 text-center text-xs text-neutral-600">
              Product photography coming soon.
            </figcaption>
          )}
        </figure>
      ))}
    </section>
  );
}
