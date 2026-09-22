import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

/** Refresh only: protected pages/actions must independently verify identity. */
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabasePublicConfig();
  let response = NextResponse.next({ request });
  const cacheHeaders = new Headers();

  // Also prevent shared caching when a session is present but needs no refresh.
  // Conservatively apply this to any cookie-bearing request; no token parsing.
  if (request.cookies.getAll().length > 0 || ["/account", "/login", "/forgot-password", "/reset-password", "/reset-password/complete"].includes(request.nextUrl.pathname) ||
      request.nextUrl.pathname.startsWith("/auth/")) {
    cacheHeaders.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
    cacheHeaders.set("Pragma", "no-cache");
    cacheHeaders.set("Expires", "0");
  }

  const client = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const previousCookies = response.cookies.getAll();
        // Rebuild request forwarding so downstream RSCs see refreshed cookies.
        response = NextResponse.next({ request });
        previousCookies.forEach((cookie) => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // SSR 0.12.7 supplies headers on the first write only. Retain them.
        Object.entries(headers).forEach(([name, value]) => cacheHeaders.set(name, value));
      },
    },
  });

  try {
    await client.auth.getClaims();
  } catch {
    // A failed refresh must not break public browsing. Never authorize here,
    // expose diagnostics, or discard cookie deletions already emitted by SSR.
    cacheHeaders.set("Cache-Control", "private, no-store");
  }

  cacheHeaders.forEach((value, name) => response.headers.set(name, value));
  return response;
}
