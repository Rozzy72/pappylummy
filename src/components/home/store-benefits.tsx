const benefits = [
  {
    title: "Nationwide Delivery",
    description: "Football style for fans across Nigeria.",
  },
  {
    title: "Find Your Football Style",
    description: "Explore club colours, national teams and retro favourites.",
  },
  {
    title: "Browse with Ease",
    description: "Compare jersey styles, sizes and Naira prices in one place.",
  },
];

export function StoreBenefits() {
  return (
    <section aria-labelledby="store-benefits-heading" className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-8 sm:mb-8 sm:px-8">
      <h2 id="store-benefits-heading" className="sr-only">Shopping with Naija Kits</h2>
      <ul className="grid gap-8 md:grid-cols-3 md:gap-10">
        {benefits.map((benefit) => (
          <li key={benefit.title}>
            <h3 className="text-sm font-semibold">{benefit.title}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {benefit.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
