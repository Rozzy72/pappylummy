"use client";
import { NIGERIAN_STATES } from "@/lib/delivery";

import {
  Stack,
  Grid,
  Select,
  Heading,
  Text,
  FieldLabel,
  Input,
  Button,
  Form,
  NavLink,
  PasswordField,
  PasswordToggle,
} from "@sd/ui";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { signIn, signUp } from "@/app/login/actions";
import { registrationErrors } from "@/lib/auth/validation";
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
  const [errors,setErrors]=useState<Record<string,string>>({});
  const error=(field:string)=>errors[field]?<Text id={`signup-${field}-error`} look="small" role="alert">{errors[field]}</Text>:null;
  const confirmRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(
    async (previous: AuthState, form: FormData) => {
      try {
        const result=await (signup ? signUp : signIn)(previous, form);
        setErrors(result.fieldErrors??{});
        return result;
      } finally {
        if (passwordRef.current) passwordRef.current.value = "";
        if (confirmRef.current) confirmRef.current.value = "";
      }
    },
    initialState,
  );
  if (signup && state.status === "success") return (
    <Stack as="section" gap="6" aria-labelledby="check-email-heading">
      <Text look="eyebrow">ONE MORE STEP</Text>
      <Heading as="h1" id="check-email-heading">Check your email</Heading>
      <Stack gap="3" role="status" aria-live="polite"><Text>Open the confirmation link in your inbox to verify your email and continue to your profile.</Text><Text look="small" muted>If your address is eligible, a confirmation email will arrive shortly. Check your spam folder too. If you already have an account, sign in instead.</Text></Stack>
      <Text look="small" muted>Haven’t received it? You can request a fresh confirmation email below.</Text>
      <NavLink href="/resend-confirmation">Resend confirmation email</NavLink>
    </Stack>
  );
  const title = signup ? "Create account" : "Sign in";
  return (
    <Stack
      as="section"
      surface="paper"
      gap="6"
      aria-labelledby={`${mode}-heading`}
    >
      <Heading as="h1" id={`${mode}-heading`}>
        {title}
      </Heading>
      {signup && <Text muted>Your details first. Confirm your email to finish setting up your account.</Text>}
      <Form action={action} aria-busy={pending} noValidate={signup} onSubmitCapture={event=>{
        if(!signup)return;
        const next=registrationErrors(new FormData(event.currentTarget));setErrors(next);
        const first=["full_name","email","phone","address","city","state","password","confirm_password"].find(key=>next[key]);
        if(first){event.preventDefault();const control=event.currentTarget.elements.namedItem(first);if(control instanceof HTMLElement)control.focus();}
      }} onInputCapture={event=>{const target=event.target;if(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)setErrors(previous=>{const next={...previous};delete next[target.name];return next;});}}>
        <Grid layout={signup ? "form" : "single"}>
        {signup && <Stack gap="2"><FieldLabel htmlFor="signup-name">Full name</FieldLabel><Input id="signup-name" name="full_name" aria-invalid={Boolean(errors.full_name)} aria-describedby={errors.full_name ? "signup-full_name-error" : undefined} autoComplete="name" required maxLength={100} disabled={pending}/>{error("full_name")}</Stack>}
        <Stack gap="2">
          <FieldLabel htmlFor={`${mode}-email`}>Email address</FieldLabel>
          <Input
            id={`${mode}-email`}
            name="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
          {error("email")}
        </Stack>
        </Grid>
        {signup && <>
          <Stack gap="2"><FieldLabel htmlFor="signup-phone">Phone number</FieldLabel><Input id="signup-phone" name="phone" aria-invalid={Boolean(errors.phone)} type="tel" autoComplete="tel" required maxLength={30} disabled={pending} aria-describedby={errors.phone ? "signup-phone-error signup-phone-help" : "signup-phone-help"}/><Text id="signup-phone-help" look="small" muted>Include your country code, for example +234.</Text>{error("phone")}</Stack>
          <Stack gap="2"><FieldLabel htmlFor="signup-address">Address</FieldLabel><Input id="signup-address" name="address" aria-invalid={Boolean(errors.address)} autoComplete="address-line1" required maxLength={300} disabled={pending} aria-describedby={errors.address ? "signup-address-error signup-address-help" : "signup-address-help"}/><Text id="signup-address-help" look="small" muted>Enter your house number and street.</Text>{error("address")}</Stack>
          <Grid layout="form"><Stack gap="2"><FieldLabel htmlFor="signup-city">City</FieldLabel><Input id="signup-city" name="city" aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "signup-city-error" : undefined} autoComplete="address-level2" required maxLength={100} disabled={pending}/>{error("city")}</Stack><Stack gap="2"><FieldLabel htmlFor="signup-state">State</FieldLabel><Select id="signup-state" name="state" aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? "signup-state-error" : undefined} autoComplete="address-level1" required defaultValue="" disabled={pending}><option value="" disabled>Choose your state</option>{NIGERIAN_STATES.map(state=><option key={state} value={state}>{state}</option>)}</Select>{error("state")}</Stack></Grid>
        </>}
        <Grid layout={signup ? "form" : "single"}>
        <Stack gap="2">
          <FieldLabel htmlFor={`${mode}-password`}>Password</FieldLabel>
          <PasswordField>
            <Input
              ref={passwordRef}
              id={`${mode}-password`}
              name="password"
              aria-invalid={Boolean(errors.password)}
              type={visible ? "text" : "password"}
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 12 : 1}
              maxLength={128}
              aria-describedby={signup ? (errors.password ? "signup-password-error signup-help" : "signup-help") : undefined}
            />
            <PasswordToggle
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? "Hide" : "Show"}
            </PasswordToggle>
          </PasswordField>
          {error("password")}
          {signup && (
            <Text look="small" muted id={`${mode}-help`}>
              Use 12–128 characters.
            </Text>
          )}
        </Stack>
        {signup && <Stack gap="2"><FieldLabel htmlFor="signup-confirm-password">Confirm password</FieldLabel><Input ref={confirmRef} id="signup-confirm-password" name="confirm_password" aria-invalid={Boolean(errors.confirm_password)} aria-describedby={errors.confirm_password ? "signup-confirm_password-error" : undefined} type={visible ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={128} disabled={pending}/>{error("confirm_password")}</Stack>}
        </Grid>
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
