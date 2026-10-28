# Email signup, confirmation and account setup

Register at /login?mode=register with an email and password of 12–128 characters. The signup action passes only validated credentials and an operator-configured emailRedirectTo. The confirmation destination is APP_ORIGIN/auth/confirm, sharing the strict origin validation used for password recovery. The email confirmation handler verifies the token with Supabase, writes the session cookies and redirects only to /account/setup. No user-supplied redirect is followed.

After email confirmation, the authenticated setup page offers the existing own-profile name/phone editor, account and shopping links. Profile creation remains owned by the existing database trigger. New customers receive no admin access. All profile writes still require independently verified identity and own-row database policies.

/resend-confirmation can resend a signup verification email. The response is neutral for nonexistent, already registered, provider-error and rate-limited accounts. Invalid or duplicate emails fail before calling Auth. The signup and login pages provide the resend link. Expired/reused confirmation links fail safely and offer this recovery path.

## Dashboard verified for local testing

Project xmmsnrryudhibcdvsosb has new-user signup, email authentication and Confirm email enabled. Existing custom SMTP is enabled with smtp.gmail.com. Sender credentials were not changed. Exact local callbacks are allowlisted: http://127.0.0.1:4311/auth/confirm and http://127.0.0.1:4311/auth/recovery. The signup template uses RedirectTo plus TokenHash/type=email only for the exact local confirmation URL; its previous SiteURL link is retained for other destinations. Production Site URL, callbacks, templates and sender delivery must be configured and verified separately before deployment. No production deployment was made.

The existing password-reset flow remains at /forgot-password, /auth/recovery and /reset-password. Its local email template and callback are preserved. The owner previously completed a real password reset successfully. Fresh signup delivery and continuation with lizzyconlow122@gmail.com remain pending owner-entered password and email confirmation. Never enter the password in chat, auto-confirm users, generate substitute login sessions, or weaken email confirmation to complete a test.

Use Supabase's normal signup/resend/recovery rate limits. The provider is responsible for email delivery and one-use token validation. No secrets are exposed to client code. Auth callbacks use private/no-store and no-referrer responses. Account setup and auth-related pages are non-cacheable.

References: https://supabase.com/docs/guides/auth/auth-email-templates and https://supabase.com/docs/reference/javascript/auth-resend


Registration collects full name, email, phone, address, password and matching password confirmation. The server validates every field before contacting Auth. Only contact fields are sent as user metadata; no roles or ownership values are accepted. Address is stored as Auth contact metadata and displayed in setup/My Account; name and phone prefill the verified setup form and are saved to the own-row profiles record when the customer continues. Confirmation remains required in Supabase. Password confirmation is never stored or sent to Supabase. Existing accounts and password recovery retain their flow.

Registration now captures address line, city and Nigerian state separately, sharing the checkout list of 36 states plus FCT. State values are allowlisted on the server. Older combined address metadata remains readable. The registration form is centred without a side panel.

My Account Edit details now updates address, city and state through authenticated Auth.updateUser contact metadata. No identity or privilege fields are accepted. All three address fields may be cleared; partial or invalid addresses are rejected before writes. Name/phone writes and Auth metadata cannot be atomic: a metadata failure explicitly reports that name/phone saved but address did not.

Checkout now verifies the optional signed-in user before reading their own profile. Only name, email, normalized phone and validated address/city/state reach delivery inputs. Guests stay supported. Checkout responses are private/no-store. Initial values remain editable and never submit an order or modify a profile automatically.

2026-10-27: Confirmation links open an explicit confirmation form; GET and prefetch do not consume tokens. Verification requires a same-origin POST against APP_ORIGIN. Authentication routes use no-referrer and no-store. Already-confirmed customers can sign in instead of registering again.

Registration now validates each required field in browser and server with per-field feedback. Successful email confirmation initializes only the verified users empty profile name/phone from validated contact metadata; existing profile edits are preserved. Address, city and state are shown separately in My Account. Passwords are never displayed.

Confirmation forms use Referrer-Policy: same-origin so native browser POSTs retain their Origin. The POST requires the exact configured application origin. Null or foreign origins remain rejected.
