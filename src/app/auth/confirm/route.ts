import { createClient } from "@/lib/supabase/server";
import { readConfirmation } from "@/lib/auth/validation";

export async function GET(request: Request) {
  const headers = new Headers({
    "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "Referrer-Policy": "no-referrer",
  });
  let destination = "/login?confirmation=failed";
  const verification = readConfirmation(new URL(request.url).searchParams);
  if (verification) {
    try {
      const client = await createClient({ writableCookies: true, responseHeaders: headers });
      const { data, error } = await client.auth.verifyOtp(verification);
      if (!error && data.session) destination = "/account";
    } catch {
      // Never expose confirmation hashes or Auth diagnostics.
    }
  }
  // Relative Location avoids trusting request/forwarded host headers.
  headers.set("Location", destination);
  return new Response(null, { status: 303, headers });
}
