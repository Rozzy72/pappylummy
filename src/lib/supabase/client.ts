import "client-only";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  // @supabase/ssr reuses its browser singleton by default.
  return createBrowserClient<Database>(url, publishableKey);
}
