# Database schema plan

Planning only: no tables, migrations, grants or RLS policies have been created.
RLS is mandatory before any application table is exposed through the Data API.

## Proposed tables

All application tables use UUID primary keys and created_at/updated_at timestamptz.
Database defaults set creation times; database-controlled triggers update updated_at.
Index foreign keys used in ownership checks and joins.

| Table | Likely fields and relationships |
| --- | --- |
| products | id UUID PK; unique slug; name; description; club/team, league, country, category, season; image paths; is_active; is_new, is_featured, is_best_seller; currency fixed to NGN; price_kobo and nullable original_price_kobo as nonnegative bigint values. Archive products rather than deleting order history. |
| profiles | id UUID PK and FK to auth.users.id; display_name; phone. Keep authentication email/password management in Supabase Auth. No user-editable administrator role. |
| addresses | id UUID PK; user_id FK to profiles.id; recipient_name; phone; address_line1/2; city; Nigerian state; optional postal_code; country_code; is_default. Ownership must remain immutable to customers. |
| orders | id UUID PK; unique order reference; user_id FK to profiles.id; currency; subtotal_kobo, shipping_kobo, total_kobo; constrained order_status and payment_status; shipping-address snapshot; optional source address_id; paid_at. Server creates trusted totals/statuses. Retention and account-deletion handling require a deliberate policy. |
| order_items | id UUID PK; order_id FK to orders.id; product_id FK to products.id; future variant_id; product name/SKU/size snapshots; positive integer quantity; unit_price_kobo and line_total_kobo snapshots. Preserve purchased details even when catalogue data changes. |

## Prices, snapshots and inventory

Use integer kobo in persistent storage, not floating-point Naira. The current frontend
uses Naira; a later typed adapter must convert deliberately. Check nonnegative values,
currency consistency, safe numeric bounds and price relationships in the database.
A discounted original price, when supplied, should exceed the current price.

Create orders and their lines atomically from authoritative product/variant prices.
Recalculate totals on the server; browser cart values are only display hints.
Keep address, item price and product-description snapshots stable after purchase;
editing a saved address must not change a historical order.

Before real checkout, introduce product_variants (unique product_id + size/SKU)
with stock quantity and active state. Use transactional reservations/atomic stock
updates and idempotent payment processing to prevent overselling or duplicate orders.
The current inStock flag and client quantity maximum are not inventory enforcement.
No inventory tables or payment code are implemented in this task.

## Mandatory future RLS and grants

Enable RLS explicitly through reviewed migrations on every exposed table.
Start with no access, then grant only required table/column operations.
Test anonymous access and at least two distinct user identities.

| Table | Planned policy |
| --- | --- |
| products | anon/authenticated may SELECT only is_active rows. No customer INSERT/UPDATE/DELETE. Catalogue writes require a verified administrator operation or tightly scoped trusted server process. |
| profiles | authenticated may SELECT their own id = auth.uid() row and UPDATE allowed personal fields on that row. Use USING and WITH CHECK; prevent ID/ownership changes. Provision rows through a trusted signup mechanism; do not permit self-assigned roles. |
| addresses | authenticated may SELECT/INSERT/UPDATE/DELETE only where user_id = auth.uid(), with both existing-row and new-row checks. |
| orders | authenticated may SELECT their own user_id = auth.uid() rows. No direct customer writes to totals, ownership, payment state or fulfillment state. Creation/status changes use validated server operations. |
| order_items | SELECT allowed only when an owning order exists with orders.user_id = auth.uid(). No direct customer writes to prices, quantities or snapshots after creation. |

Do not infer admin privileges from user-editable profile fields or user metadata.
Keep trusted roles in protected claims/server-managed records. A privileged backend
key bypasses RLS, so every future privileged operation needs its own authorization,
input validation and audit trail. These foundations do not include such a key.

When introducing functions, prefer invoker permissions; any SECURITY DEFINER function
requires a fixed search_path, narrow EXECUTE grants and explicit ownership checks.
Grants/column restrictions complement RLS, which controls rows rather than protected
field changes. RLS is planned here, not deployed or tested against a live database.
