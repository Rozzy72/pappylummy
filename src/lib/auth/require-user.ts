import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Verify with Auth on every invocation; cookies/proxy alone are not identity. */
export async function requireUser(writableCookies = false) {
  try {
    const client = await createClient({ writableCookies });
    const { data, error } = await client.auth.getUser();
    if (!error && data.user?.id) return { client, userId: data.user.id };
  } catch {
    // Fail closed without exposing Auth errors or request credentials.
  }
  redirect("/login");
}
