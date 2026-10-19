/** Approved flat NGN delivery fee per order. Revalidate on the server before payment. */
export const DELIVERY_ZONES = [
  { id: "osun", label: "Within Osun State", fee: 2000 },
  { id: "other-nigeria", label: "Outside Osun State (Nigeria)", fee: 5000 },
] as const;
export function deliveryFee(zone: string): number | null {
  return DELIVERY_ZONES.find((option) => option.id === zone)?.fee ?? null;
}

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT (Abuja)",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;
export function stateDeliveryFee(state: string): number | null {
  if (!NIGERIAN_STATES.some((value) => value === state)) return null;
  return deliveryFee(state === "Osun" ? "osun" : "other-nigeria");
}
