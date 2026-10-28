import { createClient } from "@/lib/supabase/server";
import { readRecoveryCode } from "@/lib/auth/validation";

export async function GET(request: Request) {
  const headers = new Headers({
    "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
    "Pragma": "no-cache", "Expires": "0", "Referrer-Policy": "no-referrer",
  });
  let destination = "/login?recovery=failed";
  const params = new URL(request.url).searchParams;
  const code = readRecoveryCode(params);
  const hash = params.get("token_hash");
  const recoveryToken = params.getAll("token_hash").length === 1 && params.getAll("type").length === 1 && params.get("type") === "recovery" && [...params.keys()].every(key => key === "token_hash" || key === "type") && hash && /^(?:pkce_)?[a-f0-9]{56}$/.test(hash) ? hash : null;
  if (recoveryToken) {
    try {
      const client = await createClient({ writableCookies: true, responseHeaders: headers });
      const { data, error } = await client.auth.verifyOtp({ token_hash: recoveryToken, type: "recovery" });
      if (!error && data.session) destination = "/reset-password";
    } catch {
      // Tokens, callback URLs and raw authentication errors must never be logged.
    }
  }
  if (code) {
    try {
      const client = await createClient({ writableCookies: true, responseHeaders: headers });
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (!error && data.session) destination = "/reset-password";
      else if (error?.code === "pkce_code_verifier_not_found") destination = "/login?recovery=missing-browser";
      else if (error?.code === "bad_code_verifier") destination = "/login?recovery=browser-mismatch";
      else if (error?.code === "flow_state_expired" || error?.code === "otp_expired") destination = "/login?recovery=expired";
    } catch {
      // Never log callback URLs, authorization codes or Auth diagnostics.
    }
  }
  headers.set("Location", destination);
  return new Response(null, { status: 303, headers });
}
