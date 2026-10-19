import { Stack, Heading, Text, Grid, Box, LinkButton } from "@sd/ui";
import { getProducts } from "@/lib/products/queries";
export default async function Clubs() {
  const products = await getProducts();
  const clubs = [
    ...new Set(products.flatMap((p) => (p.club ? [p.club] : []))),
  ].sort();
  return (
    <Stack gap="6">
      <Text look="eyebrow" muted>
        Wear your allegiance
      </Text>
      <Heading as="h1">Your club. Your colours.</Heading>
      <Grid layout="three">
        {clubs.map((club) => (
          <Box surface="paper" p="6" border key={club}>
            <Stack>
              <Heading as="h3">{club}</Heading>
              <Text muted>
                {products.filter((p) => p.club === club).length} jerseys in the
                collection
              </Text>
              <LinkButton
                variant="outline"
                href={`/shop?club=${encodeURIComponent(club)}`}
              >
                Explore {club} →
              </LinkButton>
            </Stack>
          </Box>
        ))}
      </Grid>
    </Stack>
  );
}
