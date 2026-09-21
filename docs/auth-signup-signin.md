# Task 14D: email/password auth (live configuration pending)

## Manual Dashboard checks before live testing

- Email/password provider and new-user signup must be enabled.
- Site URL must be the exact trusted application origin for the test environment
  (for local development, the actual localhost port). Verify production separately.
- Restrict Redirect URLs to exact trusted application endpoints; no broad production
  wildcard. This phase supplies no emailRedirectTo or user-controlled next parameter.
- Confirm email-confirmation ON/OFF explicitly. Both signup session/no-session
  results are supported. Confirmation ON is recommended for launch.
- Configure Confirm signup email template to use:
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
  Use this expression as the email link href. The handler accepts ONLY type=email
  with either a 56-character lowercase hexadecimal digest or `pkce_` followed by
  a 56-character lowercase hexadecimal digest. The complete value is passed
  unchanged to Supabase, including the PKCE prefix. Recovery/OAuth are excluded.
- Review password minimum/strength and compromised-password controls. Application
  signup bounds are 12–128 characters, signin 1–128; Supabase remains authoritative.
  Confirm these bounds are compatible with the configured provider policy.
- Review Auth signup/signin/email rate limits and abuse protection. Do not enable
  CAPTCHA without adding and testing the corresponding application token flow.
- Verify SMTP sender/domain, delivery, quotas, and recipient restrictions. Default
  development email delivery may be restricted; do not assume public delivery works.

No Dashboard settings were changed. No real credentials or test users were used.

## Security and boundaries

Server Actions accept only validated email/password and retain Next.js origin/host
checks. Emails are trimmed/lowercased; passwords are neither trimmed nor echoed.
No profile INSERT: the verified 14C trigger owns profile lifecycle. Duplicate-account
signup responses use the same neutral message as confirmation-required signup;
all signin failures share one message. Supabase's public Auth API remains accessible
and its configured rate limits/anti-enumeration behavior must also be tested.

Confirmation exchanges the hash through verifyOtp, writes cookies through the
existing SSR adapter, and redirects to fixed relative /account or
/login?confirmation=failed. It never derives a redirect origin from Host/next.
Session-bearing responses and auth routes are non-cacheable; route responses retain
SSR cache headers. No app logging of passwords, tokens, hashes, or cookies.
Hosting/access logs must redact confirmation query strings; this code cannot control
external logs. Consider email link scanners when testing one-use confirmation links.

/account remains a public placeholder with no private data. Arrival there is NOT
an authorization check. Cart/wishlist storage and current catalogue authority remain
unchanged. No recovery, OAuth, signout, checkout, or profile UI was added.

## Live verification pending

After Dashboard review, test disposable signup with confirmation enabled, delivery,
valid/expired/reused links, malformed types/hashes, fixed redirects, wrong-password
and missing-account messages, session cookies/refresh, no-store headers, pending UI,
password clearing, and anonymous browsing. Test confirmation-disabled signup only
in an isolated appropriate environment; do not toggle live policy casually.
Verify profile creation and local cart/wishlist selections survive auth navigation.
Check browser back/forward and actual cookie propagation on confirmation redirects.
Do not proceed to protected account data until the separate 14E boundary exists.

References reviewed:
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
