import { Box, Text } from "@sd/ui";
export default function Loading() {
  return (
    <Box py="9">
      <Text role="status" muted>
        Loading your wishlist…
      </Text>
    </Box>
  );
}
