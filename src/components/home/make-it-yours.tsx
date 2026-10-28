
import { Heading, Icon, MarketingArtwork, CustomiseSteps, LinkButton, Section, Stack, Text } from "@sd/ui";

export function MakeItYours() {
  return (
    <Section id="make-it-yours" width="full-bleed" tone="inverse" spacing="editorial" aria-labelledby="make-it-yours-heading">
        <div id="make-it-yours-layout">
          <div id="make-it-yours-copy">
            <Stack gap="6">
              <Text look="eyebrow">05 / MAKE IT YOURS</Text>
              <Heading id="make-it-yours-heading" look="display-lg">MAKE IT YOURS</Heading>
              <Text measure>Personalise your jersey with your name and number. Stand out. Be unique. Be you.</Text>
              <div><LinkButton href="/customize" variant="secondary" size="3">Customise Now <Icon name="arrow" /></LinkButton></div>
              <Text look="small">Illustrative lettering preview. Checkout is not yet available.</Text>
            </Stack>
          </div>
          <MarketingArtwork kind="banner" /><CustomiseSteps />
        </div>
    </Section>
  );
}
