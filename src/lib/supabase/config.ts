type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

/** Lazy validation: importing a helper does not require configured credentials. */
export function getSupabasePublicConfig(): SupabasePublicConfig {
  // Explicit public references are required for Next.js browser inlining.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url) throw new Error("Supabase: NEXT_PUBLIC_SUPABASE_URL is required when creating a client.");
  if (!publishableKey) throw new Error("Supabase: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required when creating a client.");

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Supabase: NEXT_PUBLIC_SUPABASE_URL must be a valid project URL.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (
    (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) ||
    parsed.username || parsed.password || parsed.search || parsed.hash
  ) {
    throw new Error("Supabase: use an HTTPS project URL (HTTP is allowed only for local development), without credentials, query or fragment.");
  }
  // Intentionally accept modern publishable keys only, not legacy JWTs or secret keys.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error("Supabase: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable key, never a secret or service-role key.");
  }

  return { url, publishableKey };
}
