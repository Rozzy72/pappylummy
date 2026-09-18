import { CartContents } from "@/components/cart/cart-contents";
import { getCatalogueSnapshot } from "@/lib/products/snapshot";

export default async function CartPage() {
  const products = await getCatalogueSnapshot();
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Cart</h1>
      <CartContents products={products} />
    </>
  );
}
