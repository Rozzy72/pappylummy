# Product adapter foundation

Task 12E update: homepage, shop and product detail reads now use the server query layer.
See storefront-cutover.md. The static identity/persistence bridge remains; descriptions
below of a pending cutover record the earlier foundation stage.

Storefront retrieval remains static. No helper is imported by pages, components,
cart or wishlist. The reviewed seed files are unchanged.

src/types/database.ts is a manually maintained products-only schema contract from
001_initial_schema.sql, with Row/Insert/Update and no outgoing relationships.
Other tables remain deferred; this is not a claim to be generated full-schema types.
Existing browser and server clients already use Database and need no changes.
Types do not grant write privileges.

src/lib/products/adapter.ts maps database UUIDs directly, converts validated integer
kobo to display Naira, converts nullable optional values to undefined, renames image
and merchandising fields, validates categories/sizes and copies arrays. Null primary
images use the existing placeholder; malformed paths fail. Only flat /products/
asset paths with supported image extensions are accepted. Publication and currency
are not Product fields; currency is checked and publication is filtered in queries.
Timestamps are intentionally not mapped. Errors contain no database values or secrets.
Future checkout must calculate trusted totals server-side in integer kobo.

src/lib/products/queries.ts is server-only and uses the existing request-scoped
public-credential client. Both helpers filter is_active. getProducts orders by unique
slug ascending, deliberately not static array position; future homepage merchandising
must account for this ordering. getProductBySlug validates and uses an equality filter,
returning null for invalid/missing slugs and throwing a generic error for query failure.
The list is appropriate for the current 12 rows; add pagination before growing beyond
the API row limit. No live requests were required to prepare these helpers.

## Persisted-state transition

Task 12D implements version 2 using the static catalogue compatibility boundary.
See cart-wishlist-migration.md for current behavior. The original cutover plan below
remains guidance for the later live-catalogue transition, not a pending ID migration.

Use the following fixed mapping, also recorded in product-seed.md:

| Legacy ID | UUID |
| --- | --- |
| jersey-001 | 423bb850-23f3-493f-a3c1-5b03c2096f93 |
| jersey-002 | 698ac8ab-fc88-4dd8-a403-23c0fb13af7d |
| jersey-003 | 2b7406a9-e38c-443b-92c5-3b980ffdc42a |
| jersey-004 | 65d16266-be4a-4ac7-a19c-1b18495ee69c |
| jersey-005 | fa09893e-6a0c-45d2-a353-24026ab3d4b8 |
| jersey-006 | 3967aaf4-83c6-4f9e-ac7e-7196740ebcac |
| jersey-007 | 28994dcb-c17b-4618-975b-d26efa8cbbf3 |
| jersey-008 | 6cb862e8-9f7c-438f-b2fa-7fcbf155c8f4 |
| jersey-009 | c843f7c8-8506-4993-98a2-2def6d9d4e57 |
| jersey-010 | 4f01d219-1bf8-4bc7-aa19-b4f4cc377ea5 |
| jersey-011 | e006008a-f14a-4cc3-ac28-8fd0c7afe687 |
| jersey-012 | c3a2afe2-cc30-4839-b081-70bdac68bfdf |

Coordinate switching all catalogue consumers with a version increment for each
Zustand persist store. Use a versioned migrate callback plus validation during merge;
keep the current hydration-safe UI and guarded storage access. Do not perform the
transition before trusted UUID catalogue data is available. A fetch failure must not
wipe storage as though the catalogue were empty.

Treat the entire saved envelope as unknown. Catch malformed JSON, reject unsupported
shapes and discard malformed entries. Translate known legacy IDs, retain known UUIDs,
and discard unknown IDs; resolve every resulting ID against the current trusted active
catalogue. This normalization must be idempotent on already migrated state.

For cart lines require integer quantity 1–10 and a size in the resolved product sizes.
Preserve the current out-of-stock exclusion. Rebuild names, images, slugs and display
prices from the catalogue, never storage. Merge duplicate UUID+size lines once and cap
combined quantity at 10; retain separate sizes. For wishlist, validate IDs and deduplicate
with a set. Do not merge old state into already migrated state a second time. Persist
only validated items at the new version. Invalid storage falls back to a usable empty
state without crashing; storage errors retain memory state. Client prices never become
authoritative for payment. Test repeated migration, mixed IDs, unknown IDs, invalid
sizes, nonfinite quantities, duplicate lines, broken JSON and refresh before rollout.

## Local verification

Run node tests/product-adapter.test.mjs, npm.cmd run lint, and
node node_modules/typescript/bin/tsc --noEmit --incremental false.
The test uses installed TypeScript to compile local modules into an isolated temporary
directory and cleans it afterward. It needs no environment values or database access.
It compares the actual seed rows to the static catalogue and tests invalid boundaries.
