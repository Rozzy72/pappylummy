"use client";

import { useActionState } from "react";
import { signOut } from "@/app/auth/sign-out/actions";
import type { AuthState } from "@/lib/auth/validation";

const initialState: AuthState = { status: "idle", message: "" };

export function SignOutForm() {
  const [state, action, pending] = useActionState(signOut, initialState);
  return (
    <form action={action} aria-busy={pending}>
      <button type="submit" disabled={pending} className="min-h-11 rounded-md px-2 text-sm font-medium text-neutral-600 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
        {pending ? "Signing out…" : "Sign out"}
      </button>
      <p role="status" aria-live="polite" className="max-w-48 text-sm text-neutral-600">{state.message}</p>
    </form>
  );
}
