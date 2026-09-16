# Cart and wishlist ID migration (Task 12D)

Task 12E update: homepage, shop and product detail reads now use the server query layer.
See storefront-cutover.md. The static identity/persistence bridge remains; descriptions
below of a pending cutover record the earlier foundation stage.

The storefront still reads src/data/products.ts. No Supabase retrieval, credentials,
API calls, schema changes or checkout processing are involved.

## Identity and compatibility

src/lib/products/identity.ts holds the single runtime legacy-ID-to-UUID mapping
reviewed in product-seed.md. It resolves either ID form only when backed by the
current trusted static catalogue and exposes canonical UUID Product identities.
The original catalogue IDs are unchanged. Unknown IDs, including valid-looking
UUIDs and object-property names, are rejected. Mapping lookup uses Map.

Cart operations normalize incoming IDs; reconstructed cart lines use UUIDs. Wishlist
operations and isWishlisted normalize both forms. Wishlist buttons use isWishlisted,
and the wishlist product filter normalizes static IDs. Header counts are still based
on quantities and item counts, so require no changes. Both hydration hooks retain
skipHydration and the existing once-per-store client-effect pattern.

## Persistence version 2

The keys remain naija-kits-cart and naija-kits-wishlist, with the existing Zustand
state/items envelope. Both use version 2 and migrate at hydration. Reconciliation
also runs during merge, so same-version storage is never trusted. Only items are
persisted; hydrated and store functions never come from storage.

Known legacy IDs become UUIDs; known UUIDs are retained. Cart entries require an
in-stock catalogue product, a current product size, and integer quantity 1–10.
Malformed entries and invalid quantities are discarded. Duplicate UUID+size lines
merge in first-seen order with combined quantity capped at 10. Different sizes stay
separate. All names, slugs, image paths and display prices are rebuilt from the
catalogue. Wishlist IDs are deduplicated in first-seen order. Reconciliation produces
the same result when repeated and does not mutate input state.

The existing guarded storage and hydration recovery contain malformed JSON and
storage-access failures. Corrupt initial storage leaves a usable empty state;
reconciliation rejects invalid parsed shapes. No persisted code or paths execute.
The compatibility catalogue is local and available synchronously; no network failure
can be mistaken for an empty catalogue in this task. Task 12E must coordinate replacing
that source and must not wipe persisted items when a catalogue fetch fails.

## Checkout boundary

Future checkout submits only required product identifiers, selected options and
quantities. The server must retrieve authoritative products, check publication,
stock and sizes, obtain integer-kobo pricing and calculate totals itself. Browser
prices and totals remain display data only.

## Verification

Run node tests/product-id-migration.test.mjs. Tests exercise the real Zustand stores
with isolated in-memory storage plus the shared reconciliation functions. They cover
all 12 mappings, rejected IDs and shapes, quantity/size validation, duplicate caps,
idempotence, metadata replacement, version-1 hydration, repeated version-2 rehydration,
legacy-ID operations and malformed JSON. This is a local persistence simulation;
no live browser or Supabase is needed. Run the adapter tests, lint and TypeScript too.
