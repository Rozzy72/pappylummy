# Task 14F: password recovery

## Security model and installed SDK

Supabase JS 2.116.0 and SSR 0.12.7 use PKCE in createServerClient.
resetPasswordForEmail creates an SDK verifier/challenge. The SSR cookie adapter
immediately writes the verifier through the writable Server Action client.
The default SDK flow-id redirect experiment is disabled; this callback accepts
only one opaque code and exchanges it with exchangeCodeForSession(code).
No Task 14D token-hash format is reused. Codes are 1–2048 printable non-space
ASCII characters, passed unchanged. Missing/duplicate/extra parameters fail closed.
The SDK, not local syntax validation, establishes whether a code is authentic.

The email must be opened in the same browser/profile and application origin that
requested it, with its verifier cookies intact. Request one flow at a time and use
the latest email. Missing verifier, expired or consumed code gives a generic error.

Both /reset-password and its Server Action independently call requireUser(), which
uses getUser(). The action opts into writable cookies for updateUser. The default
helper remains read-only, preserving Task 14E behavior. Only { password } is sent.
Any verified authenticated user can use this operation: it is NOT recovery-only
and there is no custom flag, JWT-claim assumption or recovery credential. No normal
account Change password feature or header/signout UI is added.

## Validation, privacy and cache

Email and password validators are shared with signup/signin without changing their
policy: email trimmed/lowercased, raw input bounded to 254, one string value;
password 12–128 for signup/reset, unchanged 1–128 signin. Passwords are not trimmed.
The form clears its password field after submission and never returns it in state.
All syntactically valid recovery requests have identical public response content,
including missing accounts, SDK errors, rate limits and network/config failures.
This is response-content protection, not a claim of constant-time requests or a
replacement for Supabase rate limiting. No raw error or user metadata is rendered.

Email redirects use server-only APP_ORIGIN plus fixed /auth/recovery, never incoming
Host/forwarded headers or form parameters. Callback redirects are fixed relative
/reset-password or /login?recovery=failed. Password success redirects to the fixed
/reset-password/complete page, then offers /account. No signout is performed.

Recovery pages are force-dynamic and proxy response headers explicitly private /
no-store, including anonymous recovery requests. Callback returns private/no-store
and no-referrer headers and uses the existing writable SSR cookie adapter.
No application logging includes codes, credentials or auth diagnostics. Framework,
reverse-proxy and hosting access logs can capture callback query strings: redact
or suppress credential-bearing URLs in those systems before deployment. Do not
share recovery URLs, terminal request logs, DevTools captures or HAR exports.

## Required manual configuration (do not change Confirm signup template)

1. Supabase Dashboard > Authentication > URL Configuration: keep local Site URL
   http://localhost:3000. Ensure Redirect URLs includes exactly
   http://localhost:3000/auth/recovery. If an existing localhost wildcard already
   covers it, an additional entry is not technically necessary; use the explicit
   recovery entry when reviewing the allowlist. Preserve other required auth URLs.
2. Authentication > Email Templates > Reset Password: use the Supabase-hosted
   verification link, not a direct TokenHash link to our confirmation handler:

   ```html
   <h2>Reset your password</h2>
   <p>Follow this link in the browser where you requested the reset.</p>
   <p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
   ```

   ConfirmationURL sends the user through Supabase verification, which then returns
   a PKCE code to the server-controlled /auth/recovery destination. Do not substitute
   SiteURL, TokenHash or a caller-provided next URL here. SMTP settings stay unchanged.
3. Local development defaults APP_ORIGIN to http://localhost:3000, so no .env.local
   change is needed at that origin. If using a different local origin, the operator
   must set APP_ORIGIN to that exact origin and update the allowed callback together.
4. Before production, set server-only APP_ORIGIN in deployment configuration to the
   actual HTTPS storefront origin (no path/query/fragment/credentials), set the
   Dashboard Site URL appropriately, and allow that origin plus /auth/recovery.
   Production has no localhost fallback. No production domain is assumed here.

The example environment file adds only an empty APP_ORIGIN variable. No live
Dashboard settings or .env.local values were changed. Inspect existing settings
before applying the above; their current remote values were not read in this task.

## Tests and manual verification

Automated tests use synthetic data and mocked transport, including the installed
SSR SDK's actual verifier-cookie and code-exchange behavior. They do not send email
or establish live sessions. Cookie propagation in the running Next.js server and
actual delivery are covered by the tester-reported manual verification below.

Manually request recovery at the canonical localhost origin, open the newest email
in that same browser, verify /reset-password, submit a compliant new password and
check the fixed success destination. Check anonymous reset denial, invalid/reused
links, generic request responses and no-store headers without exporting secrets.
No live recovery test was performed by the agent. No Task 14G work is included.

References:
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession
- https://supabase.com/docs/guides/auth/auth-email-templates

## Completed manual verification and request feedback

The tester reported successful request, email delivery, same-browser PKCE callback,
reset form, password update, completion page, and fresh Incognito authentication
with the new password reaching the protected account. The agent did not repeat
the live recovery flow.

The unchanged generic request response appears in a bordered, padded in-page
success banner. Its always-mounted polite, atomic status region announces feedback
without moving keyboard focus. No submitted email or auth diagnostics are added.
The uncontrolled email input and existing form reset behavior remain unchanged.
