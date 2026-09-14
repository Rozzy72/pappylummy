# RLS attack-test plan

NOT EXECUTED. Run only after separate migration approval and application to a
disposable test project/database. Never run these mutation tests against production.
This task creates no fixtures, users, tables or policies remotely.

## Test setup

Use a publishable key with no user session for anon tests, then independent verified
User A and User B sessions for authenticated tests. Do not use an owner/service-role
connection to judge RLS: those can bypass it. Never log JWTs, keys, full customer rows
or payment references. Retain only test names, HTTP status/SQLSTATE, row counts and
pass/fail results.

After approval, a trusted fixture process creates an active product, an inactive
product, Profile A/B, Address A/B, Order A/B (with payment references), and Item A/B.
Use full valid rows so constraint failures cannot masquerade as RLS success.
Keep baseline identifiers and values for trusted after-checks. A separate privileged
verification process may confirm denied mutations made no changes, without exposing
credentials to browser tests. Public catalogue fixtures contain no customer data.

## Required tests

| Test | Request / actor | Expected |
| --- | --- | --- |
| A | anon selects active product | Row returned. |
| B | anon selects known inactive product by ID and slug | Zero rows; no private data. Repeat with authenticated A. |
| C | anon inserts an otherwise valid product | Denied; no new row. |
| D | anon updates active product price | Denied; original price unchanged. |
| E | A selects Profile A | Own profile returned. |
| F | A selects Profile B, including selecting without an ID filter | B absent; no more than A's row returned. |
| G | A selects Address B | Zero B rows; repeat unfiltered to verify all returned ownership. |
| H | A inserts a valid address with user_id = B | Denied by ownership WITH CHECK; no row. |
| I | A selects Order A | Own order returned, including own payment reference. |
| J | A selects Order B | Zero rows; B payment reference never returned. |
| K | A inserts a valid order for A | Denied by table privileges; no row even for correct ownership. |
| L | A changes Order A total/status/payment_status/payment_reference | Each denied; baseline unchanged. |
| M | A selects Item B directly and via embedded order joins | No B items returned; own Item A remains readable. |
| N | Missing/malformed/expired/tampered authentication | Rejected or anon-scoped; no profiles, addresses, orders or items exposed. Active public products may remain readable. |

A denied SELECT may return an empty result rather than an HTTP error. Missing table/
column grants can produce permission errors before RLS executes. A denied UPDATE/
DELETE can also affect zero rows: always verify persisted state and affected rows,
not just HTTP success/failure. Error codes alone do not prove correct isolation.

## Positive and adversarial follow-ups

- A updates own profile full_name/phone: allowed and updated_at advances. Attempts
  to set id/created_at/updated_at are denied. Profile INSERT/DELETE remain denied.
  A attempting to update B changes nothing.
- A creates, edits and deletes own address: allowed. Update Address A ownership to B,
  or change primary key/timestamps: denied by column grants as well as ownership
  rules. Updating/deleting Address B affects zero rows. Multi-row requests and
  upsert attempts must not bypass ownership.
- A and B both attempt product INSERT/UPDATE/DELETE, including inactive products:
  denied. Verify no price, active flag or catalogue mutation occurred.
- A attempts order DELETE and item INSERT/UPDATE/DELETE, including quantity,
  unit price, product snapshot and order_id reassignment: all denied.
- anon reads every private table: denied. A/B request private counts and joins:
  never reveal each other's rows. Test null-user orders: invisible to both.
- Validate API grants separately from RLS using has_table_privilege and
  has_column_privilege in the later administrative test harness. Confirm no client
  TRUNCATE, REFERENCES or TRIGGER grants, and no direct EXECUTE on the timestamp
  function. No BYPASSRLS privilege should be present on client roles.
- Inspect pg_policies and pg_class: all five application tables have RLS enabled;
  exactly nine policies with the intended roles and operations; no extra broad
  policies, views or functions defeat isolation.
- Check clients cannot call timestamp trigger logic as an RPC, or spoof ownership
  via editable JWT metadata/profile fields. Auth identity must be a verified JWT.

## Constraint and history checks (trusted disposable fixtures only)

- Negative money, blank required strings, malformed/duplicate slug, invalid category,
  invalid/null sizes, invalid status, quantity 0/11 and inconsistent totals fail.
- Valid zero price, absent original price, NULL payment reference, empty arrays
  and valid boundary quantities 1/10 succeed. Duplicate non-NULL payment references fail.
- Two default addresses for one user fail; one default for each of A/B succeeds.
- Very large integer arithmetic cannot wrap to accept inconsistent totals.
- Updating an address or product leaves historical order snapshots unchanged.
- Deleting a saved address leaves orders unchanged.
- Deleting a product sets product_id NULL without deleting items or snapshots.
- Deleting auth User A removes their profile/addresses, preserves orders with NULL
  ownership and all snapshots/items; neither remaining customer can access them.
- Only a trusted deliberate order deletion cascades its order items.
- Updates to the four mutable tables update updated_at without granting the caller
  write access to ownership, timestamps or unrelated fields.

Record outcomes and inspect failures before enabling application queries. This plan
does not certify live RLS behavior; SQL must first pass its separate security review.
