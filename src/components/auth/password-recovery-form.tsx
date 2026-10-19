"use client";

import { Stack, Feedback, Text, FieldLabel, Input, Button, Form } from "@sd/ui";
import { useActionState, useRef } from "react";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { resetPassword } from "@/app/reset-password/actions";
import type { AuthState } from "@/lib/auth/validation";

const initialState: AuthState = { status: "idle", message: "" };

export function PasswordRecoveryForm({ mode }: { mode: "request" | "reset" }) {
  const passwordRef = useRef<HTMLInputElement>(null);
  const reset = mode === "reset";
  const [state, action, pending] = useActionState(
    async (previous: AuthState, form: FormData) => {
      try {
        return await (reset ? resetPassword : requestPasswordReset)(
          previous,
          form,
        );
      } finally {
        if (passwordRef.current) passwordRef.current.value = "";
      }
    },
    initialState,
  );
  return (
    <Form action={action} aria-busy={pending}>
      {reset ? (
        <Stack gap="2">
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            ref={passwordRef}
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            aria-describedby="password-help"
          />
          <Text look="small" muted id="password-help">
            Use 12–128 characters. Additional password security requirements may
            apply.
          </Text>
        </Stack>
      ) : (
        <Stack gap="2">
          <FieldLabel htmlFor="recovery-email">Email address</FieldLabel>
          <Input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </Stack>
      )}
      <Feedback
        emphasized={!reset && state.status === "success"}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {state.message}
      </Feedback>
      <Button fullWidth type="submit" disabled={pending}>
        {pending
          ? "Please wait…"
          : reset
            ? "Save new password"
            : "Send reset instructions"}
      </Button>
    </Form>
  );
}
