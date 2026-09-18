export const productPlaceholder = "/products/placeholder.svg";
export const productImageEndpoint = "/storage/v1/object/public/product-images/";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const filename = /^(?:main|front|back|detail(?:-[1-9][0-9]*)?)(?:-dev)?-v[1-9][0-9]*\.webp$/;

export function isProductImageReference(value: unknown, productId: string): value is string {
  if (value === productPlaceholder) return true;
  if (typeof value !== "string" || /\s/.test(value) || /\s/.test(productId) || !uuid.test(productId)) return false;
  const parts = value.split("/");
  return parts.length === 2 && parts[0] === productId && filename.test(parts[1]);
}
export function getProductImage(value: unknown, productId: string): string {
  return isProductImageReference(value, productId) ? value : productPlaceholder;
}
export function getProductGallery(main: unknown, additional: unknown, productId: string): string[] {
  const images = [getProductImage(main, productId)];
  if (Array.isArray(additional)) {
    for (const value of additional) {
      if (isProductImageReference(value, productId) && !images.includes(value)) images.push(value);
      if (images.length === 9) break;
    }
  }
  return images;
}
/** Public image retrieval requires only an origin, never an API key. */
export function getProductImageOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid Supabase image origin configuration."); }
  if (value !== value.trim() || url.protocol !== "https:" || url.username || url.password ||
      url.port || url.pathname !== "/" || url.search || url.hash ||
      !/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)+$/.test(url.hostname) ||
      /^[0-9.]+$/.test(url.hostname) || url.hostname.endsWith(".localhost")) {
    throw new Error("Invalid Supabase image origin configuration.");
  }
  return url.origin;
}
export function resolveProductImage(value: unknown, productId: string): string {
  const reference = getProductImage(value, productId);
  if (reference === productPlaceholder) return reference;
  const origin = getProductImageOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return origin ? origin + productImageEndpoint + reference : productPlaceholder;
}
