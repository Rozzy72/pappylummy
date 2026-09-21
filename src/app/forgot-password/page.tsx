import Link from "next/link";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
export const dynamic = "force-dynamic";
export default function ForgotPasswordPage() {
  return <section className="mx-auto max-w-lg">
    <h1 className="text-3xl font-semibold">Forgot password?</h1>
    <p className="mt-3 text-neutral-600">Request a reset email, then open its link in this same browser.</p>
    <PasswordRecoveryForm mode="request" />
    <Link href="/login" className="mt-6 inline-block underline focus-visible:outline-2">Back to sign in</Link>
  </section>;
}
