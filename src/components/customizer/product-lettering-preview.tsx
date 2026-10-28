import { JerseyPreview, JerseyPhotoPreview, hasLetteringArtwork, Stack, Text } from "@sd/ui";
import type { JerseyPreviewProps } from "@sd/ui";
import type { Product } from "@/types/product";

type Appearance = Pick<JerseyPreviewProps, "palette" | "secondaryPalette" | "pattern">;
// Presentation themes only: never catalogue metadata, identity, pricing or an asset claim.
// No gallery image is assumed to be a back view. Unknown styles remain neutral.
const themes: Readonly<Record<string, Appearance>> = {
  "nigeria-home": { palette: "forest" },
  "nigeria-retro": { palette: "forest", secondaryPalette: "paper", pattern: "sleeves" },
  "arsenal-home": { palette: "scarlet", secondaryPalette: "paper", pattern: "sleeves" },
  "barcelona-home": { palette: "royal", secondaryPalette: "scarlet", pattern: "stripes" },
  "manchester-united-home": { palette: "scarlet" },
  "liverpool-home": { palette: "scarlet" },
  "bayern-munich-home": { palette: "scarlet" },
  "ac-milan-home": { palette: "scarlet", secondaryPalette: "ink", pattern: "stripes" },
  "real-madrid-player": { palette: "paper" },
  "brazil-international": { palette: "gold", secondaryPalette: "forest", pattern: "sleeves" },
};
export function getLetteringTheme(slug: string): Appearance | undefined {
  return Object.hasOwn(themes, slug) ? themes[slug] : undefined;
}

export function ProductLetteringPreview({ product, name, number }: { product: Product; name: string; number: string }) {
  const theme = getLetteringTheme(product.slug);
  return (
    <Stack gap="4">
      <Text look="small">{product.name} — lettering preview</Text>
      {hasLetteringArtwork(product.slug)?<JerseyPhotoPreview jersey={product.slug} name={name} number={number}/>:<JerseyPreview {...(theme ?? { palette: "paper" })} name={name} number={number} />}
      {!hasLetteringArtwork(product.slug) && !theme && <Text look="small" muted>Neutral template: colours and back design are unverified.</Text>}
    </Stack>
  );
}
