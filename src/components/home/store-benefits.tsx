import { Section, Stack, Text, Heading, Grid, LinkButton } from "@sd/ui";
const benefits = [
  { title: "Find your colours", copy: "Browse club, national-team and retro collections in one place.", href: "/shop", link: "Explore jerseys" },
  { title: "Make it personal", copy: "Try your name and number on supported jerseys in the Kit Lab.", href: "/customize", link: "Visit the Kit Lab" },
  { title: "Keep your shortlist", copy: "Save jerseys to your wishlist on this browser and come back to them later.", href: "/wishlist", link: "Your wishlist" },
];
export function StoreBenefits() {
  return (
    <Section id="store-benefits" spacing="editorial" aria-labelledby="benefits-heading">
      <Stack gap="8">
        <Heading id="benefits-heading" look="heading-lg">WHY SHOP WITH US</Heading>
        <Grid layout="three">
          {benefits.map((benefit) => (
            <Stack key={benefit.title} gap="4">
              <Heading as="h3">{benefit.title}</Heading>
              <Text muted>{benefit.copy}</Text>
              <div><LinkButton href={benefit.href} variant="text">{benefit.link}</LinkButton></div>
            </Stack>
          ))}
        </Grid>
      </Stack>
    </Section>
  );
}
