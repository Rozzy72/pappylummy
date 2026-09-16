import Link from "next/link";
import { ProductGrid } from "@/components/product/product-grid";
import { getProducts } from "@/lib/products/queries";

export async function NewArrivals() {
  const products = await getProducts();
  const newArrivals = products.filter((product) => product.isNew === true).slice(0, 4);

  return (
    <section aria-labelledby="new-arrivals-heading" className="py-12 sm:py-16">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
            Fresh in the collection
          </p>
          <h2 id="new-arrivals-heading" className="mt-3 text-3xl font-semibold tracking-tight">
            New Arrivals
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-neutral-600 sm:text-base">
            Find your next match-day favourite among our latest jersey additions.
          </p>
        </div>
        <Link href="/shop" className="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-sm text-sm font-semibold underline underline-offset-4 hover:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-4">
          View All<span className="sr-only"> jerseys in the shop</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ProductGrid products={newArrivals} />
    </section>
  );
}
