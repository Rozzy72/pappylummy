"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrationErrors, readCredentials, readEmail, readRegistrationDetails, type AuthState } from "@/lib/auth/validation";

import { confirmationRedirectUrl } from "@/lib/auth/registration-config";

const checkEmail: AuthState = {
  status: "success",
  message: "If your address is eligible, check your inbox and spam folder. Open the confirmation email to verify your address and finish your profile. You can sign in if you already have an account.",
};
const signInError: AuthState = { status: "error", message: "Unable to sign in. Check your details and try again." };

export async function signUp(_previous: AuthState, form: FormData): Promise<AuthState> {
  const fieldErrors=registrationErrors(form);
  if(Object.keys(fieldErrors).length) return {status:"error",message:"Please correct the highlighted fields.",fieldErrors};
  const credentials = readCredentials(form, true);
  if (!credentials) return { status: "error", message: "Enter a valid email (up to 254 characters) and a password of 12–128 characters." };
  const contact = readRegistrationDetails(form);
  if (!contact) return { status: "error", message: "Enter your full name, a phone number with 7–15 digits, an address of up to 300 characters, a city and a valid Nigerian state." };
  const confirmation = form.get("confirm_password");
  if (form.getAll("confirm_password").length !== 1 || typeof confirmation !== "string" || confirmation !== credentials.password) return { status: "error", message: "Your passwords do not match. Enter the same password in both fields." };
  let signedIn = false;
  try {
    const client = await createClient({ writableCookies: true });
    // Email destinations come from validated operator config, never request input.
    const { data, error } = await client.auth.signUp({...credentials, options:{emailRedirectTo:confirmationRedirectUrl(),data:contact}});
    if (error) {
      if (error.code === "user_already_exists" || error.code === "email_exists") return checkEmail;
      return { status: "error", message: "Unable to create an account. Check the password requirements or try again later." };
    }
    signedIn = Boolean(data.session);
  } catch {
    return { status: "error", message: "Unable to create an account. Please try again later." };
  }
  if (signedIn) redirect("/account/setup");
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

export async function resendConfirmation(_previous:AuthState,form:FormData):Promise<AuthState>{
 const email=readEmail(form);if(!email)return {status:'error',message:'Enter a valid email address of up to 254 characters.'};
 try{const client=await createClient({writableCookies:true});await client.auth.resend({type:'signup',email,options:{emailRedirectTo:confirmationRedirectUrl()}});}catch{/* Do not disclose whether an account exists or provider diagnostics. */}
 return checkEmail;
}
