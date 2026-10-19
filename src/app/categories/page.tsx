import { Stack, Heading, Text } from "@sd/ui";
import { StoreBenefits } from "@/components/home/store-benefits";
export default function Categories() {
  return (
    <Stack>
      <Text look="eyebrow" muted>
        Find your next favourite
      </Text>
      <Heading as="h1">Every side of the game.</Heading>
      <StoreBenefits />
    </Stack>
  );
}
