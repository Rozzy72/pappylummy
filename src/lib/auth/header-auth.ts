import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Presentation only. Protected pages/actions still verify their own identity. */
export async function isHeaderAuthenticated(): Promise<boolean> {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    return !error && Boolean(data.user?.id);
  } catch {
    return false; // Public browsing stays available without exposing diagnostics.
  }
}
