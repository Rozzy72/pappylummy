import { Stack, Heading, Text, NavLink } from "@sd/ui";
import { requireUser } from "@/lib/auth/require-user";
export const dynamic = "force-dynamic";
export default async function PasswordResetCompletePage() {
  await requireUser();
  return (
    <Stack as="section" width="narrow" gap="6">
      <Heading as="h1">Password updated</Heading>
      <Text muted>Your new password is ready to use.</Text>
      <NavLink href="/account">Continue to your account</NavLink>
    </Stack>
  );
}
