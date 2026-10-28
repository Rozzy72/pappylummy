import { Stack, Heading, Text, Grid, Flex, Icon, ClubDirectoryHeader, ClubCollectionCard, ReferenceArtwork } from "@sd/ui";
import { getProducts } from "@/lib/products/queries";

const badgeTeams = ["Arsenal", "Chelsea", "Manchester United", "Liverpool", "Real Madrid", "Barcelona", "Manchester City", "Bayern Munich"];
export default async function Clubs() {
  const products = await getProducts();
  const clubs = [...new Set(products.flatMap(p => p.club ? [p.club] : []))].sort();
  return (
    <Stack gap="6">
      <ClubDirectoryHeader>
        <Stack gap="3">
          <Text look="eyebrow" muted>THE CLUB COLLECTION</Text>
          <Heading as="h1" look="heading-lg">Your club. Your colours.</Heading>
          <Text muted measure>Find your team and explore its jersey collection.</Text>
        </Stack>
        <Text look="small" muted>{clubs.length} club{clubs.length === 1 ? "" : "s"} to explore</Text>
      </ClubDirectoryHeader>
      <Grid layout="three">
        {clubs.map(club => {
          const count = products.filter(p => p.club === club).length;
          return <ClubCollectionCard key={club} href={`/shop?club=${encodeURIComponent(club)}`}>
            {badgeTeams.includes(club) ? <ReferenceArtwork region={club as "Arsenal"} /> : <Icon name="shirt" />}
            <Stack gap="2">
              <Heading as="h2" look="heading">{club}</Heading>
              <Text look="small" muted>{count} jersey{count === 1 ? "" : "s"} in the collection</Text>
            </Stack>
            <Flex justify="between" align="center"><Text look="small">Explore collection</Text><Icon name="arrow" /></Flex>
          </ClubCollectionCard>;
        })}
      </Grid>
    </Stack>
  );
}
