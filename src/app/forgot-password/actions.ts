"use server";

import { createClient } from "@/lib/supabase/server";
import { readEmail, type AuthState } from "@/lib/auth/validation";
import { recoveryRedirectUrl } from "@/lib/auth/recovery-config";

export async function requestPasswordReset(_previous: AuthState, form: FormData): Promise<AuthState> {
  const email = readEmail(form);
  if (!email) return { status: "error", message: "Enter a valid email address of up to 254 characters." };
  try {
    const redirectTo = recoveryRedirectUrl();
    const client = await createClient({ writableCookies: true });
    await client.auth.resetPasswordForEmail(email, { redirectTo });
  } catch {
    // Same public result for missing accounts, rate limits and infrastructure errors.
  }
  return { status: "success", message: "If an account exists for that email, password reset instructions have been sent." };
}
