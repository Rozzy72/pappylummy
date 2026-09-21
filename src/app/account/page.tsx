import { requireUser } from "@/lib/auth/require-user";

// Private rendering and fetches must never enter shared route/data caches.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { client, userId } = await requireUser();
  let profile: { full_name: string | null; phone: string | null } | null = null;
  try {
    const { data, error } = await client.from("profiles")
      .select("full_name, phone")
      .eq("id", userId)
      .maybeSingle();
    if (!error) profile = data;
  } catch {
    // Missing profiles and query failures share a non-diagnostic state.
  }
  return (
    <section className="mx-auto max-w-2xl" aria-labelledby="account-heading">
      <h1 id="account-heading" className="text-3xl font-semibold tracking-tight">Your account</h1>
      {profile ? (
        <dl className="mt-6 space-y-5 rounded-xl border border-neutral-200 p-6">
          <div>
            <dt className="text-sm font-medium text-neutral-600">Full name</dt>
            <dd className="mt-1 break-words">{profile.full_name || "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-neutral-600">Phone</dt>
            <dd className="mt-1 break-words">{profile.phone || "Not provided"}</dd>
          </div>
        </dl>
      ) : (
        <p role="status" className="mt-6 text-neutral-600">Your account information is currently unavailable. Please try again later.</p>
      )}
    </section>
  );
}
