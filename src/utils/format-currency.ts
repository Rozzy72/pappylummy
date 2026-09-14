const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format an amount in Naira (not kobo) for storefront display. */
export function formatCurrency(amount: number): string {
  return nairaFormatter.format(amount);
}
