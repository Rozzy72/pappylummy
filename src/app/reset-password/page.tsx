import { requireUser } from "@/lib/auth/require-user";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
export const dynamic = "force-dynamic";
export default async function ResetPasswordPage() {
  await requireUser();
  return <section className="mx-auto max-w-lg">
    <h1 className="text-3xl font-semibold">Set a new password</h1>
    <PasswordRecoveryForm mode="reset" />
  </section>;
}
