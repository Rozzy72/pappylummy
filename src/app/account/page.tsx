import {profileAddress} from "@/lib/auth/validation";
import { isAdminUser } from "@/lib/auth/require-admin";
import { ProfileForm } from "@/components/auth/profile-form";
import { Stack, Box, Text, Heading, NavLink, Disclosure } from "@sd/ui";
import { requireUser } from "@/lib/auth/require-user";

// Private rendering and fetches must never enter shared route/data caches.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { client, userId, user } = await requireUser();
  const contact = profileAddress(user.user_metadata);
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
          My Account
        </Heading>
        <Stack p="6" border surface="paper">
          <Text look="small" muted>Email address</Text>
          <Text>{user.email || "Not provided"}</Text>

      </Stack>
        {isAdminUser(userId) && <Stack gap="3"><NavLink href="/admin/orders">Manage order requests</NavLink><NavLink href="/admin/products">Manage products and inventory</NavLink></Stack>}
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
            {contact?.address && <><Text look="small" muted>Address</Text><Text>{contact.address}</Text><Text look="small" muted>City</Text><Text>{contact.city || "Not provided"}</Text><Text look="small" muted>State / FCT</Text><Text>{contact.state || "Not provided"}</Text></>}
            <Disclosure title="Edit details"><ProfileForm name={profile.full_name ?? ""} phone={profile.phone ?? ""} address={contact?.address ?? ""} city={contact?.city ?? ""} stateName={contact?.state ?? ""} /></Disclosure>
          </Stack>
        ) : (
          <Text role="status" muted>
            Your additional profile details are currently unavailable. Your sign-in email is shown above.
          </Text>
        )}
      </Stack>
    </Box>
  );
}
