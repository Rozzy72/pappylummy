# Initial database schema: migration review

Status: supabase/migrations/001_initial_schema.sql is prepared locally only.
It has NOT been executed locally or remotely. No policies are live because of this
task. A separate security review and explicit approval must precede application.
No seed data, auth implementation or storefront migration is included.

## Tables and relationships

| Table | Design |
| --- | --- |
| products | UUID PK, unique nonblank URL-safe slug, required name/category/season, text description and image paths, optional club/league/country, empty-array defaults for sizes/images, merchandising/stock/active flags, NGN money, timestamps. Categories and size labels match the current frontend model. |
| profiles | UUID PK also FK to auth.users.id; full_name and phone only, plus timestamps. Auth credentials remain in Supabase Auth. Profile provisioning is deferred; customers cannot insert rows yet. |
| addresses | UUID PK; required user_id directly references auth.users.id; recipient/contact/address fields; country fixed to Nigeria; timestamps. At most one default address per user. |
| orders | UUID PK; nullable user_id references auth.users.id; order/payment status, NGN amounts, complete customer and delivery-address snapshots, optional unique payment_reference, timestamps. Payment reference is visible only to the owning customer through RLS (and trusted administrative roles). |
| order_items | UUID PK; order_id FK; nullable product_id FK; name/slug/size and price snapshots, quantity 1–10, creation timestamp. Items are immutable to browser roles. |

All temporal fields use timestamptz with now(). Minimal SECURITY INVOKER triggers
update updated_at on the four mutable tables. Their search_path is empty and
pg_catalog.now() is qualified. Clients receive no direct function EXECUTE privilege.
There is no SECURITY DEFINER function, dynamic SQL or profile signup trigger.

## Retention

Deleting an auth user cascades only their profile and saved addresses. Their orders
retain snapshots and become user_id NULL, inaccessible to all customer JWTs.
Deleting a saved address cannot affect an order: there is no address FK.
Deleting a product nulls order_items.product_id but preserves the item snapshot.
Deleting an order cascades its items, deliberately; browser roles cannot delete orders.
Trusted operations must follow a separately reviewed retention/account-erasure policy,
because personal order snapshots outlive auth users. Prefer archiving products and
retaining financial records to ad hoc deletion.

## Money and state integrity

All stored monetary fields are bigint kobo, with nonnegative checks and NGN currency.
An original product price must be NULL or greater than the current price.
Order total must equal subtotal plus delivery fee. Line total must equal unit price
times quantity; exact numeric casts in checks avoid bigint intermediate overflow.
No floating-point money is stored. Bigint values need safe handling during future
JavaScript mapping; do not blindly cast values beyond Number.MAX_SAFE_INTEGER.

Order statuses: pending, processing, shipped, delivered, cancelled.
Payment statuses: unpaid, pending, paid, failed, refunded.
Checks constrain vocabulary, not state transitions, payment proof or consistency
between status and payment_status. Future trusted checkout/payment code must validate
those transitions and use idempotency. The unique nullable payment_reference prevents
accidental reuse but is not a complete payment-attempt model.

The database does NOT yet verify order subtotal against the sum of all items,
or snapshot price against a current catalogue price. All order writes are denied
to clients. Future trusted checkout must calculate prices, shipping and totals and
insert orders/items atomically from trusted data. Browser cart totals remain hints.
No price or inventory authorization should depend on client-side validation.

Before checkout, design product_variants with product/size/SKU uniqueness and stock,
then add transactional reservations/atomic stock updates. The current in_stock flag
and quantity cap are not inventory validation.

## RLS and privilege matrix (prepared, not active)

| Table | anon | authenticated |
| --- | --- | --- |
| products | SELECT active rows only | SELECT active rows only |
| profiles | No access | SELECT own row; UPDATE own full_name/phone only |
| addresses | No access | SELECT/INSERT/UPDATE/DELETE own rows |
| orders | No access | SELECT own rows only |
| order_items | No access | SELECT only through an order owned by auth.uid() |

Every table explicitly enables RLS. Update policies include USING and WITH CHECK.
Address INSERT has an ownership WITH CHECK. Column-level grants prevent ownership,
primary-key and timestamp tampering even within a user's row. Profile insertion and
deletion are deferred. No broad USING(true), client admin policy or browser order write
is introduced. Parent orders also have RLS, so the order_items EXISTS check cannot
expose another user's order through this policy.

Object-scoped REVOKE ALL removes inherited default grants from PUBLIC, anon and
authenticated for the five NEW tables, followed by the explicit grants above.
This also removes TRUNCATE/TRIGGER/REFERENCES privileges that row policies alone do
not constrain. No existing unrelated tables, schema grants, default privileges or
privileged roles are changed. Supabase roles, auth.users and auth.uid() are prerequisites.
The deployment owner must have permission to create objects and triggers.
No broad function execution is granted.

RLS does not constrain database owners/superusers or roles with BYPASSRLS.
No new bypass role/key is created. Future privileged server code requires independent
authorization and audit controls; never derive admin status from editable profiles.

## Indexes and constraints

UUID PKs and unique slug/payment_reference create their own indexes. Explicit indexes:
products.is_active, addresses.user_id, orders.user_id, orders.created_at DESC,
order_items.order_id and order_items.product_id. A separate partial unique address
index enforces one default per user. Revisit the low-cardinality active index with
real query plans; avoid speculative league/category indexes until queries justify them.

Required customer/address text is nonblank. Slugs use lowercase URL-safe words.
Arrays are non-null and empty by default; populated arrays must be one-dimensional,
without null elements; sizes use known labels. Image strings are not authorization:
future asset ingestion and rendering must validate allowed paths/hosts. Phone, email
and address semantics need server validation; nonblank checks do not verify identity
or deliverability.

## Review and later application

Read docs/rls-test-plan.md before approval. This one-time migration intentionally uses
CREATE without IF NOT EXISTS so unexpected existing objects fail rather than silently
accepting schema drift. BEGIN/COMMIT keep schema, privileges and RLS atomic.
No rollback/drop script is provided because it could destroy future orders.
After approved application, test real role-based access and constraints in a disposable
environment, then generate Database types. The current empty TypeScript schema and
static product catalogue are unchanged until a later integration task.

References:
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL grants](https://www.postgresql.org/docs/current/sql-grant.html)
