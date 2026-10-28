import { createClient } from "@/lib/supabase/server";
import { readConfirmation } from "@/lib/auth/validation";
import { confirmationRedirectUrl } from "@/lib/auth/registration-config";

import { initializeRegistrationProfile } from "@/lib/auth/initialize-registration-profile";

function responseHeaders() {
  return new Headers({"Cache-Control":"private, no-cache, no-store, must-revalidate, max-age=0",Pragma:"no-cache",Expires:"0","Referrer-Policy":"same-origin"});
}

/** Email scanners and prefetches must never consume a one-time confirmation. */
export async function GET(request: Request) {
  const headers=responseHeaders();
  const verification=readConfirmation(new URL(request.url).searchParams);
  headers.set("Location",verification ? "/auth/confirm-email?"+new URLSearchParams(verification) : "/login?confirmation=failed");
  return new Response(null,{status:303,headers});
}

export async function POST(request: Request) {
  const headers=responseHeaders();
  let destination="/login?confirmation=failed";
  try {
    // Reject cross-origin submissions without trusting request/forwarded hosts.
    const expectedOrigin=new URL(confirmationRedirectUrl()).origin;
    if (request.headers.get("origin") !== expectedOrigin) return new Response(null,{status:403,headers});
    const form=await request.formData();
    const params=new URLSearchParams();
    for (const key of ["token_hash","type"]) for (const value of form.getAll(key)) {
      if(typeof value !== "string") return new Response(null,{status:400,headers});
      params.append(key,value);
    }
    const verification=readConfirmation(params);
    if (verification) {
      const client=await createClient({writableCookies:true,responseHeaders:headers});
      const {data,error}=await client.auth.verifyOtp(verification);
      if(!error && data.session) {
        if(data.user) await initializeRegistrationProfile(client,data.user);
        destination="/account/setup";
      }
    }
  } catch {
    // Never expose confirmation hashes or Auth diagnostics.
  }
  headers.set("Location",destination);
  return new Response(null,{status:303,headers});
}
