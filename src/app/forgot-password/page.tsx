import { Stack, Heading, Text, NavLink } from "@sd/ui";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
export const dynamic = "force-dynamic";
export default function ForgotPasswordPage() {
  return (
    <Stack as="section" width="narrow" gap="6">
      <Heading as="h1">Forgot password?</Heading>
      <Text muted>
        Request a reset email, then open its link in this same browser.
      </Text>
      <PasswordRecoveryForm mode="request" />
      <NavLink href="/login">Back to sign in</NavLink>
    </Stack>
  );
}
