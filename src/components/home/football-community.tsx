import { Heading, PageContainer, Section, Text } from "@sd/ui";
export function FootballCommunity() {
  return (
    <Section id="football-community" width="full-bleed" tone="muted" spacing="editorial" aria-labelledby="community-heading">
      <PageContainer>
        <div id="community-layout">
          <Text look="eyebrow">06 / BEYOND THE PITCH</Text>
          <Heading id="community-heading" look="display-xl">MORE THAN<br />A GAME.</Heading>
          <div id="community-copy">
            <Text look="eyebrow">NIGERIA. FOOTBALL. EVERY DAY.</Text>
            <Text measure>From match-day conversations to the way you dress for the weekend, football is part of everyday life. Wear your colours your way.</Text>
          </div>
        </div>
      </PageContainer>
    </Section>
  );
}
