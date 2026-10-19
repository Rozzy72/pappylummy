import { Box, Stack, Flex, Text, Heading, Wordmark, NavLink } from "@sd/ui";
const groups = [
  { title: "Shop", links: [["All Jerseys", "/shop"], ["Clubs", "/clubs"], ["National Teams", "/shop?teamType=national"], ["Retro", "/shop?category=retro"], ["New Arrivals", "/#new-arrivals"]] },
  { title: "Experience", links: [["Customise", "/customize"], ["Account", "/account"], ["Wishlist", "/wishlist"], ["Cart", "/cart"]] },
  { title: "Information", links: [["Shopping information", "/guide"]] },
];
export function Footer() {
  return (
    <Box as="footer" id="site-footer" surface="brand" py="9">
      <Box width="container">
        <Stack gap="9">
          <div id="footer-columns">
            <Stack gap="4">
              <Wordmark />
              <Text>Football culture.<br />Worn your way.</Text>
              <Text look="small">A football jersey collection for fans in Nigeria.</Text>
            </Stack>
            {groups.map((group) => (
              <nav key={group.title} aria-label={`Footer ${group.title}`}>
                <Stack gap="2">
                  <Heading as="h2" look="body">{group.title}</Heading>
                  {group.links.map(([label, href]) => <NavLink key={href} href={href}>{label}</NavLink>)}
                </Stack>
              </nav>
            ))}
          </div>
          <Flex justify="between" wrap>
            <Text look="small">© {new Date().getFullYear()} PappyLummy</Text>
            <Text look="small">Store preview · Ordering is not available yet</Text>
          </Flex>
        </Stack>
      </Box>
    </Box>
  );
}
