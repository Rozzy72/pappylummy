# Task 14E: protected account authorization

## Audit and boundary

Previously /account was a public placeholder. The request-scoped server client
reads cookies through next/headers, but cookies alone are not verified identity.
The proxy refreshes sessions with getClaims; it is not an authorization gate.
Existing auth actions do not use browser IDs, localStorage or Zustand as identity.

requireUser is server-only, takes no identity arguments, calls getUser on a fresh
server client, and returns only the verified ID and request client. Supabase JS
2.116.0's installed Auth implementation calls the Auth /user endpoint using the
session token. This supplies an up-to-date verified user rather than trusting a
stored session object. getClaims can verify JWT claims, but getUser is chosen here
for server confirmation of the current user. Errors redirect only to /login.
The redirect is outside the catch so Next.js redirect control flow propagates.

The page queries only full_name and phone, filtered by that verified ID. No profile
query occurs before verification succeeds. No client input controls identity.
Missing rows or query failures render the same generic unavailable message. Null
fields show Not provided. React escapes profile text; auth objects never enter UI.

## Database defence in depth

Migration 001 keeps profiles.id a foreign key to auth.users.id with cascade delete.
Profile SELECT is granted only to authenticated, with id = auth.uid() RLS. Thus A
can select A, but not B; anon has no SELECT privilege. Addresses use user_id,
orders use user_id, and order_items check the owning order's user_id. Migration
002 creates an identity-only profile at signup without changing these policies.
No SQL or policies were changed or executed for this task.

Tests verify application execution and repository policy definitions, not live
PostgreSQL enforcement. The tester has now reported successful live verification;
no real users or credentials are embedded in the tests.

## Caching

/account exports dynamic = force-dynamic. With the existing Next.js 16 config
(Cache Components not enabled), this opts out of shared Full Route and Data Cache
for this page and its fetches. The client also reads request cookies, and the
existing proxy gives cookie-bearing responses private/no-store headers. No cached
user or client is shared across requests. Browser response headers should also be
checked during live verification; no production build was run.

## Live verification checklist

- Signed out: /account redirects to /login without private data.
- Signed in as A: only A's name/phone (or empty values) appear.
- Add a user/profile ID query argument for B: result remains A.
- Using normal authenticated A credentials, direct profile B SELECT returns no row;
  A SELECT returns A. Anonymous profile SELECT is denied. Do not log credentials.
- Inspect account HTML/RSC response cache headers for private/no-store.
- No editing, signout, recovery, checkout or Task 14F is included.

References:
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic

## Completed live checkpoint (tester-reported)

- Anonymous direct /account: PASS, fixed /login redirect.
- Authenticated /account: PASS; only full_name and phone, with safe null states.
- UUID/token/session/private auth metadata rendered: NO.
- Authenticated identity: PASS.
- OWN PROFILE: PASS (1).
- OTHER PROFILE: PASS (0), known different existing profile.
- ENUMERATION: PASS (0).
- ANONYMOUS: PASS — denied.

These are the tester's supplied live results, not a rerun by the agent. The temporary
local diagnostic implementation and its dedicated test were removed after testing.
No real test identifiers or credentials are retained here. RLS was not changed.
