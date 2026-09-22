"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "@/lib/auth/validation";

export async function signOut(): Promise<AuthState> {
  const failure: AuthState = { status: "error", message: "Unable to sign out. Please try again." };
  try {
    const client = await createClient({ writableCookies: true });
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return failure;
  } catch {
    return failure;
  }
  // Invalidate previously visited private RSC output and refresh the shared header.
  revalidatePath("/", "layout");
  redirect("/");
}
