"use client";

import { Button, Text } from "@sd/ui";
import { useActionState } from "react";
import { signOut } from "@/app/auth/sign-out/actions";
import type { AuthState } from "@/lib/auth/validation";

const initialState: AuthState = { status: "idle", message: "" };

export function SignOutForm() {
  const [state, action, pending] = useActionState(signOut, initialState);
  return (
    <form action={action} aria-busy={pending}>
      <Button variant="ghost" type="submit" disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      <Text look="small" role="status" aria-live="polite">
        {state.message}
      </Text>
    </form>
  );
}
