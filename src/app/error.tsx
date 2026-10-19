"use client";
import { Box, Stack, Heading, Text, Button } from "@sd/ui";
export default function StorefrontError({ reset }: { reset: () => void }) {
  return (
    <Box width="narrow" py="9">
      <Stack gap="6" role="alert">
        <Text look="eyebrow" muted>
          A brief time-out
        </Text>
        <Heading as="h1">We couldn’t load this page.</Heading>
        <Text muted>
          Please try again in a moment. Your saved shopping selections remain on
          this browser.
        </Text>
        <Button onClick={reset}>Try again</Button>
      </Stack>
    </Box>
  );
}
