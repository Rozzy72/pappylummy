export type LetteringFont = "Classic" | "Modern" | "Bold";
export type Personalization = { name: string; number: string; font?: LetteringFont };
export const MAX_PRINT_NAME = 16;
/** Browser selections only; any future checkout must independently validate printing. */
export function parsePersonalization(
  value: unknown,
): Personalization | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const input = value as Record<string, unknown>;
  if (typeof input.name !== "string" || typeof input.number !== "string")
    return;
  const name = input.name
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  const number = input.number.trim();
  if (
    !name ||
    [...name].length > MAX_PRINT_NAME ||
    !/^[\p{L}\p{M} .'-]+$/u.test(name) ||
    !/\p{L}/u.test(name) ||
    !/^\d{1,2}$/.test(number)
  )
    return;
  if (input.font !== undefined && !["Classic", "Modern", "Bold"].includes(input.font as string)) return;
  return { name, number, ...(input.font ? { font: input.font as LetteringFont } : {}) };
}
export function cartLineKey(item: {
  productId: string;
  selectedSize: string;
  personalization?: Personalization;
}): string {
  return JSON.stringify([
    item.productId,
    item.selectedSize,
    item.personalization?.name ?? "",
    item.personalization?.number ?? "",
    item.personalization ? item.personalization.font ?? "Classic" : "",
  ]);
}

/** Approved charge in NGN per jersey, for name and number together. */
export const PERSONALIZATION_PRICE = 5000;
export function jerseyUnitPrice(basePrice: number, personalized: boolean): number { return basePrice + (personalized ? PERSONALIZATION_PRICE : 0); }
