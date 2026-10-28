import { Stack, NavLink, Alert, AuthBackdrop, LinkButton, Text } from "@sd/ui";
import { AuthForm } from "@/components/auth/auth-form";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    confirmation?: string | string[];
    recovery?: string | string[];
    mode?: string | string[];
  }>;
}) {
  const { confirmation, recovery, mode } = await searchParams;
  const signup = mode === "register";
  if (signup) return (
    <AuthBackdrop><Stack gap="6">
      {confirmation === "failed" && <Alert role="alert">This confirmation link could not be verified. <NavLink href="/resend-confirmation">Request a new confirmation email</NavLink></Alert>}
      <AuthForm mode="signup"/>
      <Text look="small" muted>Already have an account? <NavLink href="/login">Sign in</NavLink></Text>
      <NavLink href="/shop">Continue shopping as a guest</NavLink>
    </Stack></AuthBackdrop>
  );
  return (
    <AuthBackdrop>
      <Stack gap="5">
        {confirmation === "failed" && (
          <Alert role="alert">
            This confirmation link could not be verified. It may have expired or
            already been used. If you have already confirmed your email, sign in below. Otherwise, request a new confirmation email.
          </Alert>
        )}
        {typeof recovery === "string" && ["failed", "missing-browser", "browser-mismatch", "expired"].includes(recovery) && (
          <Alert role="alert">
            {recovery === "missing-browser" ? "This browser is missing the reset verification cookie. Request a new reset using this exact browser and site address, then open the email here." : recovery === "browser-mismatch" ? "This reset belongs to a different browser request. Request one new reset and open only that newest email in the same browser." : recovery === "expired" ? "This reset link has expired. Please request a new one." : "This recovery link could not be verified. Please request a new link."}
          </Alert>
        )}
        <AuthForm
          key={signup ? "signup" : "signin"}
          mode={signup ? "signup" : "signin"}
        >
          {!signup && (
            <NavLink href="/forgot-password">Forgot password?</NavLink>
          )}
        </AuthForm>
        <LinkButton
          fullWidth
          variant="surface"
          href={signup ? "/login" : "/login?mode=register"}
        >
          {signup ? "Back to sign in" : "Register"}
        </LinkButton>
        <NavLink href="/resend-confirmation">Need a new confirmation email?</NavLink>
        <Text look="small" muted>No account needed to browse, personalise jerseys or use your bag.</Text>
        <LinkButton fullWidth variant="text" href="/shop">Continue shopping as a guest</LinkButton>
      </Stack>
    </AuthBackdrop>
  );
}
