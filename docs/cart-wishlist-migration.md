# Cart and wishlist persistence (Task 12F)

Both stores use version 3, with skipHydration and client-effect hydration.
Cart persists only productId, selectedSize and quantity. Wishlist persists canonical
UUID candidates only. No catalogue metadata or snapshot is persisted.

Versions 1 and 2 migrate through identity-only legacy mappings. Same-version data
is also structurally reconciled. Malformed entries and unsupported migration versions
are rejected. Duplicate cart lines cap at 10; different sizes remain separate.
Quantities must be integers from 1 to 10; size syntax is validated independently
of current product availability. Unknown valid UUIDs remain candidates, not products.

The 12 legacy ID-to-UUID mappings remain in src/lib/products/identity.ts. They carry
no product metadata and do not restrict future catalogue UUIDs. Retire them only
when support for dormant historical browser storage is explicitly ended.

Cart/wishlist server pages request one current catalogue snapshot through the existing
query and adapter. Client components join selections by UUID without mutating them.
Missing/inactive products are generic removable selections, with no fabricated image,
name, price or URL. Size changes and stock changes preserve selections but disable
increment/proceed actions. Current metadata is used only for known products.

Failed reads/adapter validation produce null, distinct from a successful empty array.
Failure renders a safe retry, retains selections and hides price/image/summary data.
Retry refreshes the server snapshot. No static fallback exists. Header counts reflect
saved selections, including unavailable ones. Snapshots are not realtime inventory.

Available-items subtotals exclude unresolved, out-of-stock and invalid-size lines.
These totals remain display-only. Future checkout must reload products on the server,
validate publication/size/stock, obtain trusted integer-kobo prices and calculate totals.

## Verification

Run product-id-migration, cart-wishlist-catalogue, storefront-cutover, product-adapter
and product-image tests directly with node. Tests use isolated simulated storage and
mocked API rows, never real environment values or database mutations.

Browser checks still required: migrate v1/v2 disposable storage, inspect v3 selection-only
payloads, reload, add/remove/change quantities and save/unsave products. Verify Nigeria's
owned Storage image on cart and wishlist. Check unavailable products/sizes and failed
reads only in a disposable mocked setup; do not edit live catalogue rows for testing.
