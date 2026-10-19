import { Stack, NavLink, Alert, AuthBackdrop, LinkButton } from "@sd/ui";
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
  return (
    <AuthBackdrop>
      <Stack gap="5">
        {confirmation === "failed" && (
          <Alert role="alert">
            This confirmation link could not be verified. It may have expired or
            already been used.
          </Alert>
        )}
        {recovery === "failed" && (
          <Alert role="alert">
            This recovery link could not be verified. Please request a new link.
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
      </Stack>
    </AuthBackdrop>
  );
}
