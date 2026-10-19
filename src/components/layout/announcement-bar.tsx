import { Box, Text } from "@sd/ui";
export function AnnouncementBar({
  message = "PappyLummy · Your team. Your colours. · Store preview",
}: {
  message?: string;
}) {
  return (
    <Box id="announcement-bar" surface="brand" px="4" py="2" alignText="center">
      <Text look="small" role="note">
        {message}
      </Text>
    </Box>
  );
}
