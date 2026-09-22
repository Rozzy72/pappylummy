# Task 14G: sign-out and header authentication

The async Server Component header calls a request-scoped server-only helper once.
It uses getUser(), returning only a boolean shared by desktop/mobile presentation.
No profile query or user data enters header props. Errors show anonymous navigation;
public browsing is not gated. Account pages/actions still independently verify users.
This intentionally preserves the extra protected-page verification rather than
introducing a global identity cache. Reading request cookies makes header output
dynamic; catalogue query caching is unchanged.

Signed-out visitors see Sign in; signed-in visitors see Account and Sign out.
Mobile navigation retains its existing keyboard/focus controls and receives the
small sign-out form as a content slot. The form uses a POST Server Action with
pending/disabled feedback and a generic polite error region.

The writable SSR client calls signOut({ scope: "local" }) using the official SDK.
This signs out the current session, not every device. The SDK clears its cookies;
application code does not fabricate or manually delete auth cookies. No redirect
input is accepted. Success revalidates the root layout (including visited private
Router Cache output) then redirects to /. This is a one-time invalidation, not a
new global no-cache policy. Account remains force-dynamic and independently gated.
Proxy adds explicit private/no-store protection for anonymous /account responses
as well as existing cookie-bearing/auth responses.

SDK errors/exceptions produce only "Unable to sign out. Please try again." and do
not claim success. The installed SDK may clear local session state even when a
remote revocation error is returned; refresh will show the verified actual state.
No raw errors or credential-bearing objects are logged. Revocation is managed by
Supabase; already-issued access tokens may remain valid until their expiry.

Cart/wishlist persistence and counters are unchanged. No auth action accesses
shopping stores or browser storage. Other already-open tabs can show stale UI
until refresh/server navigation; no custom cross-tab synchronization is added.
Next client navigation can reuse layouts, so refresh is the reliable way to update
an already-open tab. No global caching of private auth data is introduced.

## Verification

Automated tests use synthetic users and mocked transport, including the installed
SSR SDK cookie removal. Run node tests/sign-out-header.test.mjs plus all existing
auth and storefront suites, TypeScript and ESLint. No live sign-out has been run.

Manual verification remains required before declaring the live stage complete:
1. Open anonymously and check Sign in on desktop and mobile; browse shop.
2. Sign in normally.
3. Confirm Account and Sign out without identity/session details.
4. Add cart/wishlist items and record quantities/counts privately.
5. Sign out using the button and confirm the fixed home destination.
6. Confirm Sign in; test browser Back for private account content and refresh a second tab.
7. Confirm cart/wishlist selections and quantities survived.
8. Request /account directly and verify fixed /login; repeat using Back/navigation.

Do not export network logs, cookies or tokens. No database/RLS/Storage changes,
new dependencies, Task 14H work or live email/recovery tests are included.
