# Supabase foundation

No database connection, migration, authentication flow, or session-refresh Proxy is active.
Existing pages still use src/data/products.ts; cart/wishlist remain local Zustand state.

## Configuration

Copy .env.example to .env.local and supply the real project URL and publishable key
from your Supabase project's Connect dialog. The example intentionally has empty values.

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Both variables are public browser configuration. Never put a secret/service-role key
in either variable; validation rejects non-publishable key formats, but cannot undo
exposure caused by putting a secret in a NEXT_PUBLIC variable at build time.
No privileged client is created here. Do not log environment values.

Configuration is checked only when createClient is called. Missing values do not affect
unrelated static pages. Invalid/missing settings produce errors naming the setting,
not its value. HTTPS is required except for loopback development URLs.

## Client boundaries and cookies

- Client Components import createClient from @/lib/supabase/client.
  The SDK provides a browser singleton. The client-only marker prevents use in
  Server Components.
- Server Components import createClient from @/lib/supabase/server and await it.
  Each invocation uses the current request's asynchronous cookies() store.
- Future Server Actions/Route Handlers that change sessions must call
  createClient({ writableCookies: true }); cookie writes then propagate and errors
  are not silently swallowed.
- The default server client reads cookies but intentionally does not write them,
  because Server Components cannot change response cookies.
- Before implementing authenticated Server Components, add the official Next.js
  Proxy session-refresh flow: update both request and response cookies and preserve
  refresh-related cache headers. Do not cache personalized/session responses publicly.
  This is a required follow-up, not an active feature.
- Verify identity server-side with getClaims()/getUser() as appropriate; never base
  authorization on an unverified getSession() user object.
- server-only and client-only markers are handled by Next.js, so no marker packages
  were added. Do not re-export the server utility from a browser-imported barrel.

src/types/database.ts is an explicitly empty schema contract, not a claim about any
remote database. Generate real Database types after migrations; do not cast query
results to the frontend Product type or use any to bypass schema checking.

## Vercel later

Set the two public variables in the Vercel project's Settings > Environment Variables.
Scope values to Development, Preview and Production as needed; use a separate
non-production Supabase project for previews. Set the project root to jersey-store
if deploying from its parent folder. Changes apply to new deployments; redeploy after
updating values, because NEXT_PUBLIC values are embedded during builds.
Do not put production values into source files. No deployment was performed.

## Official references

- [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Next.js server/client boundaries](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
