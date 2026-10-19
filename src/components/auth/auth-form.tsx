"use client";

import {
  Stack,
  Heading,
  Text,
  FieldLabel,
  Input,
  Button,
  Form,
  PasswordField,
  PasswordToggle,
} from "@sd/ui";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { signIn, signUp } from "@/app/login/actions";
import type { AuthState } from "@/lib/auth/validation";

const initialState: AuthState = { status: "idle", message: "" };

export function AuthForm({
  mode,
  children,
}: {
  mode: "signin" | "signup";
  children?: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const signup = mode === "signup";
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(
    async (previous: AuthState, form: FormData) => {
      try {
        return await (signup ? signUp : signIn)(previous, form);
      } finally {
        if (passwordRef.current) passwordRef.current.value = "";
      }
    },
    initialState,
  );
  const title = signup ? "Create account" : "Sign in";
  return (
    <Stack
      as="section"
      surface="paper"
      gap="5"
      aria-labelledby={`${mode}-heading`}
    >
      <Heading as="h1" id={`${mode}-heading`}>
        {title}
      </Heading>
      <Form action={action} aria-busy={pending}>
        <Stack gap="2">
          <FieldLabel htmlFor={`${mode}-email`}>Email address</FieldLabel>
          <Input
            id={`${mode}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </Stack>
        <Stack gap="2">
          <FieldLabel htmlFor={`${mode}-password`}>Password</FieldLabel>
          <PasswordField>
            <Input
              ref={passwordRef}
              id={`${mode}-password`}
              name="password"
              type={visible ? "text" : "password"}
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 12 : 1}
              maxLength={128}
              aria-describedby={signup ? `${mode}-help` : undefined}
            />
            <PasswordToggle
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? "Hide" : "Show"}
            </PasswordToggle>
          </PasswordField>
          {signup && (
            <Text look="small" muted id={`${mode}-help`}>
              Use 12–128 characters. Additional password security requirements
              may apply.
            </Text>
          )}
        </Stack>
        {children}
        <Text
          look="small"
          muted
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {state.message}
        </Text>
        <Button fullWidth type="submit" disabled={pending}>
          {pending ? "Please wait…" : title}
        </Button>
      </Form>
    </Stack>
  );
}
