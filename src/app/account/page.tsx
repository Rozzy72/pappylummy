import { Stack, Box, Text, Heading } from "@sd/ui";
import { requireUser } from "@/lib/auth/require-user";

// Private rendering and fetches must never enter shared route/data caches.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { client, userId } = await requireUser();
  let profile: { full_name: string | null; phone: string | null } | null = null;
  try {
    const { data, error } = await client
      .from("profiles")
      .select("full_name, phone")
      .eq("id", userId)
      .maybeSingle();
    if (!error) profile = data;
  } catch {
    // Missing profiles and query failures share a non-diagnostic state.
  }
  return (
    <Box as="section" width="narrow" aria-labelledby="account-heading">
      <Stack gap="6">
        <Text look="eyebrow" muted>
          Your personal line-up
        </Text>
        <Heading as="h1" id="account-heading">
          Your account.
        </Heading>
        {profile ? (
          <Stack p="6" border surface="paper">
            <Text look="small" muted>
              Full name
            </Text>
            <Text>{profile.full_name || "Not provided"}</Text>
            <Text look="small" muted>
              Phone
            </Text>
            <Text>{profile.phone || "Not provided"}</Text>
          </Stack>
        ) : (
          <Text role="status" muted>
            Your account information is currently unavailable. Please try again
            later.
          </Text>
        )}
      </Stack>
    </Box>
  );
}
