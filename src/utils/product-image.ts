export const productPlaceholder = "/products/placeholder.svg";

/** Accept only a single local product asset filename, never a remote URL. */
export function getProductImage(path: string): string {
  return /^\/products\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|avif|svg)$/.test(path)
    ? path
    : productPlaceholder;
}
