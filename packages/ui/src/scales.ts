export const SPACE = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
] as const;
export const TONES = [
  "neutral",
  "brand",
  "success",
  "warning",
  "danger",
  "info",
] as const;
export const VARIANTS = [
  "primary",
  "secondary",
  "text",
  "solid",
  "soft",
  "surface",
  "outline",
  "ghost",
  "link",
] as const;
export const SIZES = ["1", "2", "3", "4"] as const;
export const RADII = ["none", "sm", "md", "lg", "full"] as const;
export type Space = (typeof SPACE)[number];
export type Variant = (typeof VARIANTS)[number];
export type Size = (typeof SIZES)[number];
export type Radius = (typeof RADII)[number];

/** New compositions use this physical scale; 20/28px are legacy only. */
export const CORE_SPACING = [0, 4, 8, 12, 16, 24, 32, 48, 64, 96] as const;
export const TYPE_ROLES = ["display-xl", "display-lg", "heading-lg", "heading", "body", "body-small", "meta"] as const;
export type TypeRole = (typeof TYPE_ROLES)[number];
