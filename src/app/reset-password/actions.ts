"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { readPassword, type AuthState } from "@/lib/auth/validation";

export async function resetPassword(_previous: AuthState, form: FormData): Promise<AuthState> {
  // Independently verify on every submission, even when the page was authorized.
  const { client } = await requireUser(true);
  const password = readPassword(form);
  if (!password) return { status: "error", message: "Use a password of 12–128 characters." };
  try {
    const { error } = await client.auth.updateUser({ password });
    if (error) return { status: "error", message: "Unable to update your password. Please try again or request a new reset link." };
  } catch {
    return { status: "error", message: "Unable to update your password. Please try again or request a new reset link." };
  }
  redirect("/reset-password/complete");
}
