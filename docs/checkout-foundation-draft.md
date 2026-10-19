# Task 15C: checkout foundation SQL review

**DRAFT ONLY — NOT APPLIED. NOT READY TO APPLY.**

The candidate is `supabase/migrations/003_checkout_foundation_draft.sql`, the next number after repository migrations 001 and 002. No live connection or SQL execution formed part of this task. The static tests inspect the draft; they do not compile SQL, prove RLS behavior, or prove concurrent transaction safety. No local PostgreSQL executable/container runtime was available. **LIVE VERIFICATION REQUIRED** wherever repository and production state may differ.

## Task 15F.13: Option B identity patch preparation

This revised source has NOT been applied. Earlier revisions were tested in the
disposable project; the historical review below is not runtime evidence for this
patch. No database connection, checkout retry or permission change was performed.

Checkout reads `pg_catalog.current_setting('request.jwt.claims', true)` exactly
once before payload processing or mutations. PostgreSQL 17 exposes the signature
`pg_catalog.current_setting(text, boolean) -> text`; `true` permits a missing
setting to return SQL NULL. Empty search_path and pg_catalog runtime types remain.

Reject missing, empty/whitespace-only or malformed claims, JSON null/arrays/scalars,
non-string or non-authenticated role, missing/non-string or noncanonical subject,
and missing/non-string email. Subject requires a hyphenated UUID with either
hexadecimal case, no UUIDv4 restriction, validated before casting. Email is not
normalized: length 3–254, no control characters. NULL-safe IS DISTINCT FROM and
IS NOT TRUE guards reject missing keys. Public errors remain generic; no values log.

Nonempty `request.jwt.claim`, `request.jwt.claim.sub`, `request.jwt.claim.role`
and `request.jwt.claim.email` are rejected, including whitespace-only legacy
values. Missing/empty legacy settings are allowed. No legacy fallback prevents
modern RPC identity disagreeing with legacy-preferred policy identity.

The setting is trusted only inside authenticated PostgREST RPC, where the gateway
validates the JWT and establishes transaction-local context. Reading it is not
independent cryptographic verification. SECURITY DEFINER changes database privilege
identity, not request settings. Browser p_request cannot supply identity: exact
root/item/delivery allowlists remain unchanged. Direct SQL-capable callers can set
custom settings and are outside the browser threat boundary; do not expose an
arbitrary-SQL/settings-mutating RPC. Authenticated EXECUTE remains the sole customer
entrypoint. No new runtime privilege is introduced.

Direct auth.uid()/auth.role()/auth.jwt() calls were removed because the restricted
owner lacks lookup USAGE on the managed auth schema. No auth schema USAGE is now
requested. Helper EXECUTE grants are preserved: the retained RLS policies remain a separate runtime-verification gate.
Stored auth.uid() references are resolved objects, but installed helper semantics
and evaluation under the restricted owner still require disposable proof. Policies
are NOT rewritten; this removes direct lookup, not all Auth-object dependencies.
Inventory, money, idempotency, ownership and locking logic is otherwise unchanged.

Static tests cover guards, ordering, literal UUID constraints, allowlists,
privileges and retained policies. They do not execute SQL NULL/JSON semantics or
prove RLS. Before deployment/retry, verify current_setting EXECUTE, installed helper
semantics, modern claims availability, restricted-owner policy evaluation and
authority to replace the owned function. No membership change or live replacement
is authorized here. Separately approved synthetic parser/policy tests must fail
closed for malformed, anonymous and mismatched identities before a checkout retry.

References: [PostgreSQL configuration functions](https://www.postgresql.org/docs/17/functions-admin.html)
and [PostgREST transaction context](https://postgrest.org/en/stable/references/transactions.html).

## Repository compatibility audit

Inspected the full 001/002 migrations and `src/types/database.ts`, alongside the existing server client, verified-user helper, cart type and checkout placeholder. The manually maintained TypeScript contract currently describes products/profiles only and has no RPC definitions. This draft does not change application types or activate checkout.

| Existing table | Fields and constraints | Foreign keys / lifecycle | Policies, grants, indexes |
| --- | --- | --- | --- |
| products | UUID id; name, unique kebab slug, description; nonnegative bigint price/original price (original strictly greater when set); image_path/images; club/league/country; category home/away/third/goalkeeper/training/retro/player/international; season; allowed sizes XS through 4XL; new/featured/best-seller/stock/active flags; NGN; timestamps. Arrays reject null elements/multiple dimensions. | No parent FK. | Active-only SELECT for anon/authenticated; no customer writes. PK/slug unique and active index. |
| profiles | UUID id, nullable full_name/phone, timestamps. | auth.users CASCADE. Migration 002 creates an id-only profile via an after-insert auth trigger; no metadata copying/backfill. | Own id = auth.uid() SELECT/UPDATE; UPDATE only full_name/phone. No client INSERT/DELETE. |
| addresses | UUID id/user_id; label; required recipient/phone/line1/city/free-text state; optional line2/postal; country Nigeria; default flag; timestamps. | auth.users CASCADE. | Owned SELECT/INSERT/UPDATE/DELETE; explicit INSERT/UPDATE columns, user_id not updatable. user index and partial unique one default per user. |
| orders | UUID id, nullable user_id; status pending/processing/shipped/delivered/cancelled; payment unpaid/pending/paid/failed/refunded; NGN; nonnegative subtotal/delivery/total with exact total=sum check; customer name/email/phone; independent delivery snapshots; unique optional payment_reference; timestamps. | auth.users SET NULL preserves historical order, removes customer access. No FK to mutable address. | Own user_id SELECT only; no customer writes. user/created indexes and payment_reference unique. |
| order_items | UUID id/order/product; name/slug/size snapshots; nonnegative bigint unit/line prices; quantity 1–10; exact line=unit×quantity; created timestamp. | orders CASCADE; product SET NULL. | SELECT through owned parent; no customer writes. order/product indexes. |

001 has invoker `jersey_store_set_updated_at()` with empty search_path, revoked client execution, and triggers on products/profiles/addresses/orders. 002 has definer `jersey_store_create_profile()` with empty search_path and revoked client execution. The draft does not replace either function, change existing status CHECK values, change profile lifecycle, or remove existing ownership policies.

New variant product FKs use RESTRICT deliberately: inventory/order history must be archived, not silently deleted. Existing product SET NULL behavior remains for legacy items; products with configured variants can no longer be deleted until those dependencies are resolved. New zone/rate/state links also RESTRICT deletion. Checkout requests cascade on account deletion; orders retain their existing SET NULL ownership behavior. Reservations RESTRICT order deletion; historical item cascades remain unchanged for legacy orders. These operational changes require review.

## Draft objects and compatibility

Eight tables: nigerian_states, checkout_settings, delivery_zones, delivery_zone_states, delivery_rates, product_variants, inventory_reservations, checkout_requests. Only the 37 approved state/FCT rows and one 15-minute settings row are seeded. There are **no zones, rates, variants, quantities or product changes** in the seed statements. Canonical state identifiers are application identifiers, not ISO codes.

Addresses gain nullable state_id and delivery_instructions. Existing address grants are preserved exactly: the new fields are intentionally not client-writable in this draft. Existing saved addresses require separately reviewed canonical-state population before use; the function fails closed rather than guessing from free text. A future saved-address feature needs reviewed column grants and validation. One-off checkout does not save an address.

Orders gain a nullable checkout_version marker, canonical state, delivery instructions, zone/code/service/rate/version snapshots, reservation deadline and cancellation/review fields. Existing rows remain legacy (checkout_version NULL); their money is not rewritten or subjected to new ceilings. requires_review defaults false. Items gain a nullable variant FK and partial unique order/variant index. New checkout orders must have variants; historical NULL relationships remain allowed.

New money ceilings: unit 1–100,000,000 kobo; delivery 0–100,000,000; total at most 1,000,000,000. NGN and the existing exact arithmetic checks remain. A deferred constraint trigger checks new-order line count, total units, subtotal against the item sum, product/size versus variant, and reservation/item quantity/deadline correspondence at commit. It runs with the explicit worker definer role, since a deferred check may run after the RPC has returned to the API role. Snapshots are immutable under updates; ownership changes are rejected except existing account-deletion SET NULL. Future lifecycle code must respect this guard.

## Request and canonicalization version 1

`create_checkout_order(p_request text)` accepts a JSON document string. The future SDK call wraps `JSON.stringify(request)` in the single `p_request` argument. Text is intentional: the function checks UTF-8 octet length <=32,768 before parsing, including whitespace. A later HTTP endpoint must also bound its complete transport body; a database check cannot avoid network/JSON gateway resource use.

Allowed document:

```text
{ idempotencyKey, items: [{ productId, selectedSize, quantity }], delivery }
delivery = { kind: "saved", addressId, instructions? }
        or { kind: "one-off", recipientName, phone, addressLine1,
             addressLine2?, city, stateId, postalCode?, instructions? }
```

UUIDs use canonical lowercase notation; idempotency keys require UUIDv4/variant bits. The function rejects unknown keys, duplicate JSON object keys, duplicate product/size lines, string quantities, invalid sizes, and noninteger/out-of-range quantities. JSON numerical spellings normalize through JSONB; an integral numeric value may have an exponent spelling, but fractional quantities are not accepted. Limits: 1–20 lines, 1–10 units each, <=100 units total. Names/city <=100 characters, lines <=200, instructions <=500, optional postal exactly six digits. Text trims surrounding spaces, rejects control characters; no Unicode case folding or undocumented normalization. Empty optional text becomes NULL; JSON null instead of an optional string is rejected.

Supported mobile syntax is 0 + ten digits or +234 + ten digits, with subscriber number beginning 7/8/9. Normalize the former to +234. This proves syntax only, not allocation or ownership. Country comes from database defaults, never caller input. State must resolve to reference data. Instructions are per checkout; omission does not silently inherit saved instructions.

Canonical fingerprint: database SHA-256 of JSONB `{version:1,items,delivery}`; lines sorted by product UUID/size, normalized text/phone, optional omissions normalized consistently. Store only the 32-byte digest, version, key, owner and result link, not raw request JSON. Saved-address fingerprints contain its ID and requested instructions; resolved content is snapshotted only on first success. Replay happens before resolving mutable address/pricing/config data. Same owner/key/digest returns the original order (including if now cancelled); changed content rejects. Do not delete request rows as routine cleanup while replays must remain idempotent. A new attempt after cancellation requires a new key.

## Authority, transactions and locking

`auth.uid()` plus the authenticated JWT role gate the RPC independently of future UI/Server Actions. Supabase API signature validation is a required deployment assumption; no arbitrary caller JWT settings or direct database login may be granted. Existing future server entrypoints should also use requireUser/getUser, but the function must be safe when directly invoked via the authenticated API. Customer email snapshot comes from the verified top-level email JWT claim, not user metadata or request data. It can be stale until token refresh after an email change; ownership is always UID. Confirm this is acceptable before rollout. Deleted users cannot create an order because auth.users FKs still apply.

Idempotency INSERT ON CONFLICT plus a row lock serializes the same owner/key; failures roll back the claim as well as all inventory/orders. At READ COMMITTED a losing request sees the committed result; at stricter isolation callers may receive a generic retryable failure and must retry the same key. No exception handler commits partial work.

Lock delivery coverage/zone/rate/settings for share; select exactly one currently effective rate, then recheck its time window after inventory lock waits at the final pricing instant. Missing rows fail; zero is valid only on a real configured rate. The rate GiST exclusion blocks overlapping active periods across all services per zone, even concurrent configuration inserts. Product/size variant identity is immutable after creation. A price/service change needs a new version; only deactivation/end-date edits are permitted in place. The draft uses btree_gist's UUID operator class in extensions, so extension location is a mandatory preflight.

Lock product UUIDs in sorted order for share, then all variant UUIDs sorted for update. Verify locked counts before using records, and re-read prices/flags/sizes/counters under these locks. Products must be active, in_stock, NGN, positive priced; size must also remain in product.sizes. Variants must exist and be active. Explicit stock is authoritative; products.in_stock is only an additional availability gate. Reserved <= stock and a guarded increment prevent overselling. All snapshot, reservation, counter and request-link writes share one transaction. Configuration writers/future workers must follow compatible locking; deadlocks/serialization errors roll back safely, never be treated as success.

Inventory conservation is maintained by the two privileged routines plus denied direct customer mutation. Physical stock counts include reserved units. Manual stock maintenance must preserve reserved <= stock and reconcile active reservation sums; this draft does not invent a stock administration API. No consumption routine is exposed: the schema reserves the consumed status, but its transition requires the later audited payment phase.

## Roles, RLS and worker

`jersey_checkout_owner` and `jersey_inventory_worker` are NOLOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS roles with no memberships. They own only their functions, never tables. All new tables have RLS; policies explicitly allow the required role. Customer privileges remain states SELECT and authenticated checkout EXECUTE only, alongside their unchanged existing table access. Config, counters, reservations, requests, orders and items have no new direct customer writes. Existing own profile/address/order/item access remains intact.

All functions use empty search_path, qualified relations/functions, no dynamic SQL. Helper/trigger functions have PUBLIC/anon/authenticated EXECUTE revoked. The consistency trigger has explicit definer ownership and worker read policies so deferred execution can inspect the whole new order. Creation and privilege revocation are in one transaction. Temporary public-schema CREATE is revoked after transferring function ownership. Live preflight must ensure PUBLIC does not indirectly confer unwanted CREATE privileges, role memberships or default grants. FOR SHARE requires UPDATE privileges: checkout gets only relevant lock-key columns on products/config, and no RPC statement updates them.

Worker `release_checkout_reservations(uuid default NULL, integer default 50)` is unavailable to anon/authenticated. NULL order means expired batch (1–100 orders); an explicit ID means operator cancellation, not customer authorization. Lock order IDs with SKIP LOCKED, then **all batch variant IDs globally sorted**, then reservations. Only active rows release; counters decrement with nonnegative guard; repeated calls do nothing. An unpaid/failed pending order becomes cancelled. Paid/pending-payment orders instead require review; subsequent automatic batches skip them to avoid starvation. Operator review must reconcile such holds. Expiry is not scheduled here. Without an operational worker, stock can remain safely reserved beyond deadline and block sales.

Later provisioning should grant EXECUTE on this one worker function to a dedicated trusted database worker caller, not grant membership in the function-owner role, and never grant execution to authenticator/anon/authenticated. Credentials, scheduling, monitoring, bounded retries and audit logging need separate review. No key is added here. A future late successful payment must enter review/refund; cancelled/expired orders must never automatically enter processing/fulfillment.

## Required pre-apply gates

1. **LIVE VERIFICATION REQUIRED:** compare actual columns, checks, triggers, indexes, RLS, ownership, grants/default privileges and FK behavior against 001/002. Check for out-of-band schema changes, name collisions, existing roles or overloads. Inspect no user data/credentials in review output.
2. Confirm PostgreSQL version, UTF-8, built-in SHA-256/gen_random_uuid, auth helpers, migration-runner CREATEROLE/ownership-transfer rights, extensions schema, and btree_gist availability/location. Do not move an existing extension blindly. Roles must have no memberships; table ownership and RLS cannot be bypassed by these roles. The application must not be the migration owner.
3. Compile/apply the draft **only in a separately authorized disposable PostgreSQL/Supabase environment**, with representative legacy rows and role/grant behavior. This has NOT occurred. Check trigger execution privileges, deferred trigger context, RLS column grants for locks, EXCLUDE operator resolution, bounded duplicate-key validation, auth-user deletion and extension handling.
4. Run real transactional tests: anonymous denial; user A/B ownership; strict unknown/duplicate/type/bounds rejection; manipulated financial data; unconfigured rates/variants; explicit zero fee; overlapping/adjacent rates; current product changes; last unit contention; same-key replay/conflict; partial-failure rollback; concurrent expiry and checkout; repeated release; cross-basket lock ordering; terminal transition denial; paid/in-flight review; late result quarantine; historical row compatibility; snapshot immutability and deferred totals.
5. Independently configure verified stock/variants, coverage and approved actual rate versions. No checkout succeeds without them. Old saved addresses need deliberate canonical state mapping. No new stock/rate values are provided by this draft.
6. Before real customer availability, provision the expiry worker and rate limiting/abuse controls. Multiple fresh idempotency keys can otherwise temporarily exhaust reservations. Business per-user limits need approval; no invented quota is silently applied here. Payments/consumption and fulfillment remain future work; this is NOT permission to take paid orders.

## Rollback and operational considerations

The single DDL transaction rolls back completely on failure, including role creation. Existing histories are not rewritten; nullable additions and legacy markers isolate new checks. DDL still takes locks and can scan existing orders/items for new CHECK/FK constraints; plan a maintenance window and assess table size. After actual checkout data exists, do not drop tables/columns/roles or use destructive down SQL: disable checkout EXECUTE, reconcile/release holds under review, preserve financial snapshots and use a forward corrective migration. Before any use, a reviewed reverse migration could remove only newly created dependencies in reverse order. No rollback SQL was executed or generated here.

No application changes, payment tables, provider calls, scheduler configuration, live SQL, Storage changes or network settings are included. Documentation and test evidence are not approval to apply.

## Technical references

- [PostgreSQL SECURITY DEFINER and function privileges](https://www.postgresql.org/docs/16/sql-createfunction.html)
- [PostgreSQL btree_gist UUID exclusion support](https://www.postgresql.org/docs/15/btree-gist.html)
- [PostgreSQL built-in SHA-256](https://www.postgresql.org/docs/16/functions-binarystring.html)

## Task 15D deep review — evidence and findings

Reviewed every statement in the actual draft and its test file, against the existing migration grants and policies. No live database was contacted. `psql`, `postgres`, Docker, PostgreSQL/Docker services, and installed Node PostgreSQL execution/parser packages were not available in the checked environment. Nothing was downloaded or installed. All SQL execution, transaction scheduling, actual privilege evaluation and production compatibility remain **UNVERIFIED — REQUIRES ISOLATED/LIVE PREFLIGHT**. “Live preflight” means separately authorized read-only metadata verification, never permission to apply this draft.

No critical/high browser ownership, financial-authority or privilege-escalation exploit was demonstrated. This is not proof that none exist; the conditional definer type-resolution gap below was also removed. Confirmed source-level findings and changes:

| ID | Severity | Concrete failure / limit | Draft disposition |
| --- | --- | --- | --- |
| D1 | Medium | The original duplicate-key CTE recursively materialized arbitrary nested JSON before rejecting unknown root keys. A synthetic 2,000-level object fits in ~12KB, while the serialized descendant strings sum to >12MB. This establishes avoidable traversal amplification, not a measured PostgreSQL outage. | Root shape and 20-line bound now checked first. Duplicate detection reads original JSON only at root, delivery and item objects; arbitrary recursion removed. Nested unsupported values are rejected by the existing shape/type checks. |
| D2 | Medium | Rate lookup used a timestamp captured before product/variant waits. If its end boundary passed during those waits, the order could retain a rate already expired at snapshot creation. | A fresh clock instant after inventory validation rechecks effective_from and exclusive effective_until before order INSERT. An expired quote fails atomically; retry can use the newly effective rate. The chosen instant defines snapshot pricing, not an impossible guarantee that time cannot advance before commit. |
| D3 | Medium, operational integrity | A privileged stock/configuration update could reassign a variant's product_id/size while existing orders retained the original product/size snapshots. FK validity alone allowed this; subsequent consistency checks could then fail during expiry. Customers did not have these update privileges. | New invoker trigger forbids changes to variant id/product_id/size. Stock counters and availability remain adjustable by authorized roles. Use a new variant rather than reassigning identity. |
| D4 | Low, availability | Neither locking function bounded lock waits locally; a caller could wait indefinitely if the environment used PostgreSQL's default zero lock_timeout. Actual hosted timeout configuration is unknown. | Both routines now SET lock_timeout='5s'. This limits each lock wait, not the whole transaction. Whole-request/statement timeout remains a deployment prerequisite; function-local statement_timeout is not claimed as a solution. |
| D5 | Low, evidence quality | The 22 regex checks passed without detecting D1–D3, and cannot detect many SQL syntax, RLS, permissions, trigger-context or schedule errors. Lowercasing the entire SQL also hides case-sensitive request-key mistakes. | Added raw-case allowlist checks, source mutation checks, identity/rate/timeout/type checks and synthetic tests of extracted literal constraints. Now 33 checks; still NOT runtime SQL tests. |
| D6 | Medium, conditional definer security | Empty search_path does not remove implicit pg_temp lookup for data types. PL/pgSQL declarations/casts used unqualified uuid/text/json/jsonb names, permitting caller-session temporary type shadowing during runtime parsing. A direct-SQL caller with temporary-object capability is the relevant threat; the normal PostgREST request does not itself create such objects. No exploit was executed. | Qualified every runtime declaration/cast with pg_catalog (existing public table %rowtype references remain qualified). Empty search_path is retained. Signature/table type OIDs are bound at trusted migration DDL time; the fix targets runtime resolution. Added mutation tests and a required isolated temporary-type-shadow test. |

### Execution and object-by-object review

| Object/operation | Review result and remaining requirement |
| --- | --- |
| BEGIN/COMMIT; two CREATE ROLE statements | Transactional DDL with intentional name-collision failure. Runner needs role-creation rights and SET ROLE/ownership-transfer eligibility for the new roles. Runtime functions do not require superuser/BYPASSRLS. Actual hosted migration-runner rights unverified. |
| btree_gist | UUID GiST operator class is explicitly extensions.gist_uuid_ops; tstzrange uses the built-in range class. IF NOT EXISTS does not move/validate an existing extension. Existing extension in another schema causes resolution failure and rollback; verify availability, namespace, version and schema USAGE before application. No extension installed during review. |
| nigerian_states | PK/unique name, exactly 37 unique approved identifiers; no customer writes. |
| checkout_settings | Singleton true PK, bounded integer duration, one 15-minute row; only owner read/lock access. |
| delivery_zones / delivery_zone_states | Unique code, state PK prevents duplicate coverage; UUID zone FK and text state FK RESTRICT deletion; zone index supports relationship lookup. No seed zones. |
| delivery_rates | UUID FK, positive version unique per zone, bigint NGN fee 0..100M, finite start/end with end>start, partial exclusion of overlapping active [start,end) ranges. Stronger than service-specific exclusion: only one service is offered per zone/time. No rates seeded. Immutable price/identity trigger allows only closing/deactivation. |
| product_variants | Product UUID FK RESTRICT, size allowlist, unique product/size, required explicit stock, integer bounds reserved<=stock; timestamp and identity guards coexist. Empty initially; no inferred quantities. |
| inventory_reservations | Order/variant UUID FKs RESTRICT; qty1..10; finite required expiry; unique order/variant; active vs completed timestamp CHECK; expiry and variant partial indexes. Terminal update guard permits only active→released/expired; consumed has no transition API in this phase. |
| checkout_requests | User UUID FK CASCADE, UUIDv4 key, 32-byte fingerprint/version, unique user/key and optional unique order FK RESTRICT. NULL order is temporary within the atomic RPC; customers cannot create dangling claims directly. |
| addresses ALTER | Nullable canonical state FK and optional <=500-character instructions; no old state translation or added customer write grants. |
| orders ALTER | Nullable marker and snapshots, default-false review flag; conditional financial/snapshot constraints skip historical NULL markers. Existing status/check values and account deletion behavior retained. |
| order_items ALTER | Nullable variant FK; conditional positive bounded new-item price; partial unique order/variant index ignores historical NULLs. Existing line arithmetic check retained. |
| Constraint triggers | AFTER ROW, DEFERRABLE INITIALLY DEFERRED, no transition tables or forbidden statement-level constraint trigger. Initial order/item INSERTs queue final cross-row checking after reservations exist. Named definer owns this check to survive caller-role restoration. Execution still requires PostgreSQL proof. SET CONSTRAINTS IMMEDIATE before RPC may reject an incomplete intermediate order, but does not permit partial success. |
| Other guards | BEFORE UPDATE invoker triggers, no elevated identity access. Snapshot guard permits lifecycle fields and account SET NULL, forbids non-null ownership transfer. Reservation guard prohibits repeated terminal transitions. Variant guard prevents identity drift. |
| RLS and grants | Every new table enables RLS; customer rights explicitly revoked before two deliberate grants. No existing policies dropped/relaxed. No dynamic SQL, sequences, generated columns, enum additions, schema-wide privilege edits or existing NOT NULL conversions. Live default grants, memberships, PUBLIC schema rights and extra existing policies remain unverified. |

### Every new SECURITY DEFINER function

| Audit field | create_checkout_order(text) | release_checkout_reservations(uuid,integer) | checkout_order_consistency() |
| --- | --- | --- | --- |
| Owner | jersey_checkout_owner | jersey_inventory_worker | jersey_inventory_worker |
| Owner LOGIN / SUPERUSER / BYPASSRLS | NO / NO / NO | NO / NO / NO | NO / NO / NO |
| search_path | Empty | Empty | Empty |
| Schema-qualified external object references | Yes, including runtime types/casts | Yes, including runtime types/casts | Yes, including runtime types/casts |
| Dynamic SQL | None | None | None |
| PUBLIC / anon EXECUTE | Denied / denied | Denied / denied | Denied / denied |
| authenticated EXECUTE | Yes, sole checkout entrypoint | Denied | Denied |
| Table privileges | Explicit SELECT; lock-key/counter/link UPDATE; checkout tables INSERT | SELECT on new orders/items/variants/reservations; lifecycle/counter/terminal-column UPDATE | Same owner rights as worker, but body only reads orders/items/variants/reservations |
| RLS dependency | Explicit own-user policies and inventory/config policies; no table ownership | Explicit new-order and worker inventory policies | Explicit worker read policies; no dependence on caller's JWT at deferred execution |
| Caller identity | auth.uid() plus authenticated role, from trusted API JWT validation; never request JSON | No user JWT: privileged maintenance EXECUTE boundary; explicit order ID is NOT a customer authorization path | Trigger NEW/OLD order reference; cannot be called as ordinary RPC |

Invoker helpers/guards retain migration ownership but run with invoker rights; they do not confer the migration owner's privileges. Existing 002's profile-trigger definer is unchanged and not a dependency of checkout execution; its actual owner remains a live metadata check. No new definer relies on that owner.

### RPC attack matrix (reasoned, NOT database-executed)

| Inputs / actions | Expected enforcement |
| --- | --- |
| anon; null UID; wrong JWT role | anon lacks EXECUTE; independent uid/role guard precedes payload processing. |
| forged user/owner, unit price, subtotal, total, fee, discount, payment status/reference, currency | Root/item/delivery exact-key allowlists reject these fields. No financial/ownership function parameter exists. |
| unknown keys, objects replaced with arrays/scalars/null, strings for quantity, duplicate object keys | Type and required-key checks; bounded original-JSON duplicate scan. Malformed JSON parse errors abort with generic public failure. |
| malformed UUID, non-v4 request key, alternate UUID case/format | Reject before request-claim INSERT. No PostgreSQL permissive UUID-cast bypass because anchored canonical regex precedes cast. |
| duplicate product/size; qty0/negative/fractional/>10; >20 lines; >100 units; unsupported size | Explicit shape/regex/type/aggregate bounds and duplicate grouping before writes. Literal synthetic tests cover representative formats; PostgreSQL JSONB numeric serialization still needs runtime proof. |
| inactive product, in_stock=false, inactive/missing variant, insufficient stock, size removed from product | Verify full locked row counts and database flags/size/counter conditions. Guarded increment plus CHECK constraint. |
| zero/negative/excessive unit or excessive total | Product price must be 1..100M kobo; final total<=1B; new-row CHECKs plus pre-insert checks. |
| unsupported state/country, malformed phone/postal, foreign/missing saved address | Reference lookup; country input rejected; phone/postal syntax; saved address WHERE id=... AND user_id=auth.uid() and owner RLS. Same generic failure. |
| missing/inactive/expired/future rate or inactive/missing coverage | STRICT active coverage/rate lookup and final clock-window recheck; no coalesce-to-zero fallback. |
| overlap / duplicate effective service configuration | State PK and active-period EXCLUDE prevent ambiguity. Actual concurrent INSERT rejection requires runtime testing. |
| direct item/order/inventory writes | Customer table privileges denied, with no permissive customer write policy. |
| missing item, duplicate variant, mismatched subtotal/total, negative/excessive fee | Deferred order/item checks, partial unique index, existing arithmetic CHECKs and new ceilings. Invalid creation rolls back. Reservation-only writes by a privileged administrator are not independently covered by the order/item trigger; such maintenance remains trusted and must use the controlled routines. |

Exceptions intentionally do not disclose which address/product exists. WHEN OTHERS does not catch PostgreSQL query_canceled/assert_failure; a gateway statement timeout therefore remains its own error, not a claimed generic business response. No code logs request/claims, and generic failures do not interpolate them. Deployment SQL statement/parameter logging must separately avoid retaining customer delivery data.

### Idempotency and normalization

A/B: same owner/key locks one claim; matching fingerprint returns its existing result before mutable lookups, mismatch aborts. C: unique(user_id,key) scopes different users independently. D: simultaneous identical READ COMMITTED calls serialize through unique INSERT and row lock. E: the function's exception subtransaction rolls back all claims, orders, items, reservations and counters; deferred-constraint failures abort the outer transaction. These schedules are reasoned, not run.

Item order is sorted, JSON object whitespace/key order normalized through JSONB, supported phone spellings canonicalize to +234, and surrounding ordinary text spaces trim. Optional absent/empty-string values normalize to null. **Explicit optional JSON null is rejected**, not a second accepted fingerprint form. Uppercase/compact UUIDs are rejected, not silently normalized. Thus rejected forms never create a competing claim; do not describe them as successful equivalent retries. Internal meaningful address whitespace remains significant. A saved address edit does not mutate an old result; its first snapshot remains immutable. Fingerprinting stores a digest, not raw PII; order/address PII exists only for fulfilment snapshots, not extra request logging.

### Concurrency and financial proof boundary

Two last-unit buyers lock the same variant; the later one re-reads the counter after the first transaction and fails if unavailable. Different input item orders converge to sorted product/variant IDs. Expiry locks selected order IDs, then all affected variant IDs sorted, then active reservations; checkout creates new order IDs and does not wait on existing orders while holding variants. Replay does not lock variants. This removes an evident cycle between these two routines; unrelated administrative writers can still deadlock if they choose incompatible order, and PostgreSQL abort/retry remains required.

Stock adjustments block on the same row; reserved<=stock forbids reducing physical stock below holds. Guarded increment ensures reserved+qty<=stock; decrement requires reserved>=qty. Repeated release sees a cancelled order or no active reservation. Consumption is denied in this phase, so there is no duplicate-consumption path to exercise. Manual counter edits must still reconcile reservation sums; CHECK(reserved<=stock) alone does not prove that aggregate invariant.

Each unit is <=100M kobo and <=100 requested units: intermediate subtotal<=10B, plus fee<=100M, safely below bigint maximum. Final order ceiling is 1B. Existing numeric-cast CHECKs independently verify line arithmetic and total arithmetic without overflow; deferred SUM(numeric) verifies subtotal. No client price enters these calculations. Failure midway or at commit leaves no partial order. Five seconds bounds each lock wait only; callers retry a failed/uncertain request with the same key. Reusing a key on a committed cancelled order returns that cancelled order; a new purchase needs a new key.

### RLS / grants matrix

S=SELECT, I=INSERT, U=UPDATE, D=DELETE; “—” means none of these. Rights below assume the intended roles, no extra memberships/default grants, and required UID claim. A and B have identical capabilities restricted to their own rows, never each other's. This is a source-derived matrix, NOT live proof.

| Table | anon | customer A | customer B | checkout owner | inventory worker |
| --- | --- | --- | --- | --- | --- |
| states | S all | S all | S all | S all | — |
| zones | — | — | — | S; U(id) lock privilege | — |
| zone-state mappings | — | — | — | S; U(state_id) lock privilege | — |
| rates | — | — | — | S; U(id) lock privilege (guard also forbids identity changes) | — |
| variants | — | — | — | S; U(reserved_quantity) | S; U(reserved_quantity) |
| reservations | — | — | — | S/I for own new order, active inserts | S; U(status,completed_at), active→terminal only |
| checkout_requests | — | — | — | Own S/I; U(order_id) | — |
| addresses | — | Own S/I/U/D, original column restrictions | Own S/I/U/D, original column restrictions | Own S only | — |
| orders | — | Own S | Own S | Own S/I, new pending/unpaid only | New-order S/U lifecycle/review columns |
| order_items | — | S through owned order | S through owned order | Own S/I through new-order policy | S through new order |
| checkout_settings | — | — | — | S; U(singleton) lock privilege | — |

All unlisted I/U/D operations are denied. Checkout owner also has products S/U(id) for price-row share locks; no function updates the product identity. Function EXECUTE: anon none; A/B checkout only; checkout owner owns checkout and can call private text helper/auth claim functions; worker owns release and deferred trigger, no customer-callable maintenance path. Trigger invocation follows trigger rules rather than making a trigger routine an RPC. Do not grant end users membership in either owner role.

### Historical compatibility and recovery

Every new CHECK/FK on existing tables accepts the newly added NULL state/variant/snapshot/marker columns; requires_review's false default satisfies NOT NULL. No prior order is reclassified. The partial item uniqueness index excludes NULL variant IDs. Existing product/size/currency/status checks are not rewritten. Triggers are prospective, not retroactive backfills. Physical DDL locking/constraint scans and live type/name conflicts remain preflight requirements.

PostgreSQL CREATE ROLE, extension SQL, table/constraint/index/trigger/function/policy/grant changes here are transaction-bound; no concurrent index creation, external command or scheduler call occurs. If any statement fails, roll back the transaction, investigate without bypassing the failed check, and re-review the draft. Supabase SQL Editor execution must preserve the transaction rather than applying individual fragments. No external irreversible operation was identified; actual btree_gist provisioning/runner behavior still needs confirmation. Once orders exist, disable the entrypoint and use a forward correction after inventory reconciliation; do not drop history.

### What remains unproved / activation blockers

Compile all statements and execute positive/negative RPC calls in an approved disposable PostgreSQL/Supabase environment, using the actual auth helper behavior and restricted roles. Test migration rollback at staged failures, deferred checks under real caller restoration, EXCLUDE races, account deletion, simultaneous same-key/last-unit/expiry scenarios, request cancellation and malicious temporary-type names in a fresh backend session. Passing regex tests is insufficient. Read-only live metadata preflight must check actual schema, roles, inherited/default grants, RLS, extension namespace and migration-runner permissions. Real stock/rate configuration, saved-address canonicalization, worker operation and approved reservation-abuse controls are still prerequisites to customer activation. No quota was invented in this review.

Additional primary references: [CREATE EXTENSION and IF NOT EXISTS caveat](https://www.postgresql.org/docs/17/sql-createextension.html), [function ownership changes](https://www.postgresql.org/docs/16/sql-alterfunction.html), [PostgreSQL privileges](https://www.postgresql.org/docs/16/ddl-priv.html).

The type-resolution correction follows PostgreSQL's documented implicit pg_temp behavior: [search_path and temporary data-type lookup](https://www.postgresql.org/docs/16/runtime-config-client.html).
