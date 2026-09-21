import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

type ServerClientOptions = {
  /** Enable only in Server Actions or Route Handlers where cookies can be written. */
  writableCookies?: boolean;
  /** Route Handlers must return these SSR cache headers with their response. */
  responseHeaders?: Headers;
};

export async function createClient({ writableCookies = false, responseHeaders }: ServerClientOptions = {}) {
  const { url, publishableKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  // Request-scoped; never share a user's cookie-backed client across requests.
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Server Components remain read-only; Proxy handles session refresh.
        // Server Actions use the auth-route no-store policy in Proxy.
        if (!writableCookies) return;
        Object.entries(headers).forEach(([name, value]) => responseHeaders?.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
