import Image from "next/image";

import { Stack, Text, Flex, LinkButton, Icon, MatchdayFeatures, MobileCategories } from "@sd/ui";
import { Campaign, CampaignHeading } from "./campaign";

export function Hero() {
  return (
    <>
    <Campaign
      intro={<Stack gap="4">
        <Text look="eyebrow">PREMIUM FOOTBALL JERSEYS</Text>
        <CampaignHeading />
      </Stack>}
      media={<Image src="/campaigns/pappylummy-hero-v2.png" alt="Footballer in a green jersey in a floodlit stadium" width={1983} height={793} sizes="100vw" loading="eager" fetchPriority="high" />}
    >
      <Stack gap="6">
        <Text measure>For the match. For the street. Find your jersey and wear your passion.</Text>
        <Flex gap="3" wrap>
          <LinkButton href="/shop" size="3">Shop Jerseys <Icon name="arrow" /></LinkButton>
          <LinkButton href="/customize" variant="secondary">Customise Your Jersey</LinkButton>
        </Flex>
      </Stack>
    </Campaign>
    <MatchdayFeatures /><MobileCategories />
    </>
  );
}
