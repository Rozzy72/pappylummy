import { Stack, Heading } from "@sd/ui";
import { requireUser } from "@/lib/auth/require-user";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
export const dynamic = "force-dynamic";
export default async function ResetPasswordPage() {
  await requireUser();
  return (
    <Stack as="section" width="narrow" gap="6">
      <Heading as="h1">Set a new password</Heading>
      <PasswordRecoveryForm mode="reset" />
    </Stack>
  );
}
