# Controlled Supabase read cutover (Task 12E)

## Read graph and remaining static consumers

Before: NewArrivals and Shop imported the static products array; the detail route
and metadata used the static lookup in src/lib/products.ts, which also ranked related
products. Product cards, grids, gallery and interactive ShopCatalogue already accepted
props. Wishlist display and the identity bridge also imported the static catalogue;
cart and wishlist reconciliation consumed that bridge. Adapter and migration tests
used the catalogue as fixtures/source-of-truth comparisons.

Now: NewArrivals and Shop await src/lib/products/queries.ts on the server. Detail and
metadata await its getProductBySlug; null triggers notFound. Related products take the
server catalogue as an argument to the existing pure ranking utility. The obsolete
static lookup was removed. No individual card or filtering client queries Supabase.
Server-only helpers retain active filters, the adapter, safe slug equality queries and
existing public configuration. React cache deduplicates identical calls within a server
render (including detail/metadata); it is not a cross-request cache. Related products
require one catalogue query, not one query per card.

Remaining static production imports:
- src/lib/products/identity.ts: required transitional catalogue-backed UUID resolution,
  cart metadata/price reconstruction and persisted-state validation.
- src/components/wishlist/wishlist-contents.tsx: required transitional display source
  for saved IDs, normalized through the same bridge.
Tests also retain source catalogue inputs. No obsolete production import remains.

These transitional views still reflect the reviewed static snapshot, not subsequent
database edits. New products outside the fixed bridge are rejected by the stores.
This is acceptable only for the current verified 12-product catalogue. Coordinate
removing the bridge before adding products or treating changed database price/stock/
size information as reflected in cart/wishlist. Never use this snapshot for checkout.
The static file is not a query-error fallback and was not deleted or modified.

## Ordering and behavior

Catalogue queries order by unique slug ascending. New Arrivals keeps isNew filtering
and maximum four, now in that explicit order: Arsenal, Barcelona, Bayern Munich,
Chelsea for the seeded catalogue. It no longer inherits the old static array order.
Shop preserves all filters with AND semantics and all five sorts; stable sort ties
inherit the ordered query result. Related ranking remains team=4, league=2, category=1,
excludes the current UUID, limits to four and explicitly breaks ties by slug.

Publication filtering does not filter stock. AC Milan remains visible with inStock=false;
ProductActions disables purchase controls and the transitional store rejects it too.
All server-read products carry UUIDs, already supported by version-2 persistence.

Query/adapter failures throw, with no raw API responses logged and no static fallback.
src/app/error.tsx provides a generic retry boundary without displaying error contents.
Missing/invalid/inactive detail slugs remain separate 404 outcomes. No schema/RLS changes
were made; anonymous SELECT behavior remains consistent with the previously tested
products_read_active policy. No live policy audit was repeated for this code task.

## Automated verification

Run directly (avoids Windows subprocess EPERM):
- node tests/storefront-cutover.test.mjs
- node tests/product-id-migration.test.mjs
- node tests/product-adapter.test.mjs

Cutover tests execute the real query helpers, adapter and server components with an
isolated mocked Supabase API; client presentation components are stubs. They check
source routing, filters, UUIDs, metadata, 404s, ranking, stock and error propagation.
They do not establish live browser behavior or test React request-cache internals.
Existing migration tests cover actual stores with simulated localStorage.

## Manual browser checklist (not yet performed)

Use a disposable local browser profile and the dev server, not a real customer session.
1. Fresh state: clear this site's storage, load / and /shop. Confirm four New Arrivals,
   12 shop products and filter combinations (Arsenal + M yields one; Arsenal + 3XL none).
   Try all sorts and Clear Filters.
2. Open Arsenal. Check image, title, price, metadata, sizes, quantity 1–10 and related
   links. Select M, add quantity 1 and then 2: one UUID cart line at 3. Add L: separate
   line. Check header count, remove/update controls and refresh persistence.
3. Toggle the same wishlist product from a card and its detail page. Check count,
   saved state, wishlist page and refresh. New stored IDs should be canonical UUIDs.
4. Legacy state: in the browser's Application/Storage localStorage editor for the dev
   origin, set naija-kits-cart to the literal JSON from tests/fixtures/legacy-cart.json
   and naija-kits-wishlist to tests/fixtures/legacy-wishlist.json. These are data-only
   fixtures; do not paste executable console code. Reload immediately. Confirm cart
   Nigeria XL quantity 2, two wishlist entries, canonical UUIDs and envelope version 2.
   Refresh again and confirm unchanged counts/quantities. Use only disposable storage.
5. AC Milan: confirm visible in shop and detail, out-of-stock messaging and disabled
   purchase actions. It must not be added to cart.
6. Open a nonexistent or malformed product slug: confirm 404. Simulate a failed server
   read in a disposable local setup: confirm safe error/retry UI, no static substitution
   and no credential-bearing diagnostics. Restore local setup afterward.

No browser session was run as part of the automated checks. No production build,
Supabase writes, staging, commits or pushes are part of this task.
