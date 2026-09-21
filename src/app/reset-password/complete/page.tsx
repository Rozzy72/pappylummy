import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
export const dynamic = "force-dynamic";
export default async function PasswordResetCompletePage() {
  await requireUser();
  return <section className="mx-auto max-w-lg">
    <h1 className="text-3xl font-semibold">Password updated</h1>
    <p className="mt-3">Your new password is ready to use.</p>
    <Link href="/account" className="mt-6 inline-block underline focus-visible:outline-2">Continue to your account</Link>
  </section>;
}
