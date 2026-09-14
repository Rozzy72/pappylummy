import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

type ServerClientOptions = {
  /** Enable only in Server Actions or Route Handlers where cookies can be written. */
  writableCookies?: boolean;
};

export async function createClient({ writableCookies = false }: ServerClientOptions = {}) {
  const { url, publishableKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  // Request-scoped; never share a user's cookie-backed client across requests.
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Components cannot write response cookies. Auth integration must
        // add a session-refresh Proxy before relying on authenticated RSC reads.
        if (!writableCookies) return;
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
