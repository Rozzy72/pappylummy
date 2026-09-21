import { createClient } from "@/lib/supabase/server";
import { readRecoveryCode } from "@/lib/auth/validation";

export async function GET(request: Request) {
  const headers = new Headers({
    "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
    "Pragma": "no-cache", "Expires": "0", "Referrer-Policy": "no-referrer",
  });
  let destination = "/login?recovery=failed";
  const code = readRecoveryCode(new URL(request.url).searchParams);
  if (code) {
    try {
      const client = await createClient({ writableCookies: true, responseHeaders: headers });
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (!error && data.session) destination = "/reset-password";
    } catch {
      // Never log callback URLs, authorization codes or Auth diagnostics.
    }
  }
  headers.set("Location", destination);
  return new Response(null, { status: 303, headers });
}
