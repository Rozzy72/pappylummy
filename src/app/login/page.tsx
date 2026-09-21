import { AuthForm } from "@/components/auth/auth-form";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ confirmation?: string | string[] }>;
}) {
  const { confirmation } = await searchParams;
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-semibold tracking-tight">Your Naija Kits account</h1>
      <p className="mt-3 text-neutral-600">Sign in or create an account. You can still browse and save jerseys without signing in.</p>
      {confirmation === "failed" && <p role="alert" className="mt-6 rounded-md border border-neutral-300 p-4">This confirmation link could not be verified. It may have expired or already been used.</p>}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <AuthForm mode="signin" />
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
