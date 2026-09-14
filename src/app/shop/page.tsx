import { ShopCatalogue } from "@/components/product/shop-catalogue";
import { products } from "@/data/products";

export default function ShopPage() {
  return (
    <>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">Football Jerseys</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Shop All Jerseys</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
          Browse club, international and retro football jerseys available for football fans across Nigeria.
        </p>
      </header>
      <ShopCatalogue products={products} />
    </>
  );
}
