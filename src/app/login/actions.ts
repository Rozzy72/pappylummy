"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readCredentials, type AuthState } from "@/lib/auth/validation";

const checkEmail: AuthState = {
  status: "success",
  message: "If your address is eligible, check your email for the next step. You can also sign in if you already have an account.",
};
const signInError: AuthState = { status: "error", message: "Unable to sign in. Check your details and try again." };

export async function signUp(_previous: AuthState, form: FormData): Promise<AuthState> {
  const credentials = readCredentials(form, true);
  if (!credentials) return { status: "error", message: "Enter a valid email (up to 254 characters) and a password of 12–128 characters." };
  let signedIn = false;
  try {
    const client = await createClient({ writableCookies: true });
    // Confirmation uses the Dashboard Site URL/email template, never request input.
    const { data, error } = await client.auth.signUp(credentials);
    if (error) {
      if (error.code === "user_already_exists" || error.code === "email_exists") return checkEmail;
      return { status: "error", message: "Unable to create an account. Check the password requirements or try again later." };
    }
    signedIn = Boolean(data.session);
  } catch {
    return { status: "error", message: "Unable to create an account. Please try again later." };
  }
  if (signedIn) redirect("/account");
  return checkEmail;
}

export async function signIn(_previous: AuthState, form: FormData): Promise<AuthState> {
  const credentials = readCredentials(form, false);
  if (!credentials) return signInError;
  try {
    const client = await createClient({ writableCookies: true });
    const { data, error } = await client.auth.signInWithPassword(credentials);
    if (error || !data.session) return signInError;
  } catch {
    return signInError;
  }
  redirect("/account");
}
