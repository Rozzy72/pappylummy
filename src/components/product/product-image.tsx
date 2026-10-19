"use client";
import Image from "next/image";
import { useState } from "react";
import { productPlaceholder, resolveProductImage } from "@/utils/product-image";

type ProductImageProps = {
  reference: string;
  productId: string;
  alt: string;
  loading?: "eager" | "lazy";
  sizes?: string;
} & (
  | { fill: true; width?: never; height?: never }
  | { fill?: false; width: number; height: number }
);

export function ProductImage({
  reference,
  productId,
  alt,
  ...layout
}: ProductImageProps) {
  const source = resolveProductImage(reference, productId);
  return <ResolvedImage key={source} source={source} alt={alt} {...layout} />;
}
function ResolvedImage({
  source,
  alt,
  ...layout
}: Omit<ProductImageProps, "reference" | "productId"> & { source: string }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? productPlaceholder : source;
  return (
    <Image
      {...layout}
      src={src}
      alt={src === productPlaceholder ? alt + " — image unavailable" : alt}
      unoptimized={
        process.env.NODE_ENV === "development" && src !== productPlaceholder
      }
      onError={src === productPlaceholder ? undefined : () => setFailed(true)}
    />
  );
}
