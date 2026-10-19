import { Stack, Box, Text, Heading, Disclosure, LinkButton } from "@sd/ui";
export default function Guide() {
  return (
    <Box width="narrow" py="9">
      <Stack gap="6">
        <Text look="eyebrow" muted>
          Before kick-off
        </Text>
        <Heading as="h1">Shopping information.</Heading>
        <Text muted>
          PappyLummy is a storefront preview. You can explore the collection and
          save your selections; orders and payments are not available yet.
        </Text>
        <Disclosure title="Product imagery & descriptions" open>
          <Text muted>
            Current images are development previews. Final photography, garment
            specifications and product descriptions will be confirmed before
            ordering opens.
          </Text>
        </Disclosure>
        <Disclosure title="Sizing">
          <Text muted>
            Choose from the sizes listed on each product. Garment measurements
            and a verified size guide are not available yet. Size labels alone
            do not guarantee fit.
          </Text>
        </Disclosure>
        <Disclosure title="Delivery & returns">
          <Text muted>
            Orders dispatch from Osogbo. Flat delivery is ₦2,000 within Osun
            State and ₦5,000 elsewhere in Nigeria, per order, with no extra
            distance charge. Delivery timelines and the returns policy will be
            confirmed before ordering opens.
          </Text>
        </Disclosure>
        <LinkButton href="/shop">Explore the collection</LinkButton>
      </Stack>
    </Box>
  );
}
