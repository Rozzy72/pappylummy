# Guest order requests

The storefront can save unpaid guest order requests after deployment configuration. No payment, inventory reservation, confirmation email or fulfilment is triggered.

## Status

- Application validation and server action implemented.
- Full build and 326 tests passed.
- Supabase SQL transaction test passed and rolled back: verified service-role execution, price calculation, idempotency, font snapshot, false-price rejection and denied anon/authenticated reads and execution.
- Migration 004 was applied manually to project xmmsnrryudhibcdvsosb after user approval on 2026-10-19. The old migration 003 checkout draft is untouched; do not run the entire migration directory against this project without reconciling its history.
- The local feature is enabled with an existing service-role credential in ignored .env.local. The temporary credential transfer file was removed. No server credential was added to source or browser code. Hosting environments have not been configured.

## Activation

1. Review and apply `supabase/migrations/004_guest_order_requests.sql` in the jersey-store Supabase project. This adds a private table and service-role-only RPC; browser roles receive no access.
2. Set `SUPABASE_SECRET_KEY` in the server environment only. Never use a NEXT_PUBLIC prefix or commit a secret. Use the key belonging to the same Supabase project as NEXT_PUBLIC_SUPABASE_URL.
3. Set `GUEST_ORDERS_ENABLED=true` after database verification. The page and action require both settings.
4. Test a synthetic guest request, refresh/retry behavior, stock/price changes and unavailable-backend behavior before customer use.

## Data and behavior

Delivery name, email, phone and postal address are sent only when Save order request is selected. They remain in memory beforehand. A browser does not supply identity, currency, product titles or authoritative prices. The RPC reloads active products and sizes under row locks and compares the quoted total before inserting. Printing costs NGN 5,000 per jersey. Delivery is NGN 2,000 to Osun and NGN 5,000 elsewhere in the configured Nigerian states.

The request includes a random key kept in component memory and a server-generated fingerprint. Identical retries return the same order reference; changed payloads with the same key are rejected. Maximum 20 lines, 100 units total and 10 units per product/size across font variants. The database serializes requests with advisory locks and limits new requests to 5 per email per hour and 100 globally per hour.

Status is awaiting_payment. The cart is retained. No customer order lookup endpoint is provided; possession of a reference alone cannot read delivery information. Database access and retention of personal details require normal operator controls. Payments and operational order handling are separate follow-up work.

## Verified local end-to-end result (2026-10-19)

A signed-out browser saved one synthetic guest request (checkout-test@example.test, synthetic postal address) with reference dd61f779-9fbc-4061-836e-dd21e64b2629. Four Barcelona jerseys in size L preserved Classic and Bold printing on separate lines. Database total NGN 166,000, including Osun delivery NGN 2,000. Lagos selection showed NGN 5,000 delivery. The database row is awaiting_payment. Same-key retry returned the same reference with exactly one row; changed fingerprint was rejected. Anonymous table SELECT and RPC execution both failed. The cart was retained. No email, payment or fulfilment was triggered. The synthetic record is intentionally retained for review.

## Guest confirmation page

Saving a request now sets an HTTP-only, SameSite=Lax, host-only cookie scoped to /checkout, signed using a purpose-specific HMAC and the server credential. Secure is enabled in production. The cookie contains only the order reference and expiry (24 hours), not delivery details. The server validates its signature and expiry before fetching precisely that record; query parameters cannot select a different request. Missing, duplicate, expired and forged receipts cannot query order data. Rotating the server credential invalidates outstanding receipts. Confirmation responses are private/no-store, dynamic, and noindex/nofollow.

The page shows persisted jersey lines, name and number (fonts stay hidden), delivery details, fees, total and awaiting-payment/cancelled status. It neither takes payment nor claims reservation, dispatch or email delivery. The bag is retained. Existing requests created before receipt support do not automatically become accessible through a reference-only URL.

Browser verification created one synthetic request, reference 72ced2e5-4627-450e-bd9b-3842da79e469, using confirmation-test@example.test and a synthetic address. Automatic navigation and refresh worked, with total NGN 166,000. Verified mobile 320px and desktop 1440px layouts. Full build and 332 tests passed. Payments remain disabled.

## Local admin order management

The /admin/orders page requires a verified Supabase user whose immutable ID appears in server-only ADMIN_USER_IDS. The approved local account is lixzywayne@gmail.com. An admin can view request details, filter statuses, and explicitly confirm cancellation of an awaiting-payment request. Cancellation uses a conditional status update and cannot mark requests paid, issue refunds, reserve stock, or start fulfilment. Payments remain disabled. The allowlist is configured locally and must be configured separately before any future deployment.

Authorization and cancellation tests pass. A signed-in admin browser walkthrough remains to be completed with the account owner; no password should be shared in chat.
