# Product image application support (Task 13C)

Product.image and Product.images contain validated references, not arbitrary URLs.
The only local reference is /products/placeholder.svg. Storage references must use
the owning canonical UUID and the approved versioned WebP filename grammar.
The shared product-image utility validates references, deduplicates galleries and
resolves valid paths under the configured HTTPS origin and fixed product-images bucket.
No key is needed for public image retrieval. Missing development configuration keeps
local placeholders usable; malformed configuration fails with a value-free error and
production requires an origin. Restart Next.js after configuration changes.

The adapter replaces invalid/null main images with the placeholder, skips malformed
or foreign gallery entries, excludes the main image and caps additional images at 8.
Other adapter validation remains strict. The small ProductImage client wrapper has
no arbitrary src prop. On a Storage load error it switches to the local placeholder;
the placeholder has no retry handler. Changing source resets the image state via key.
Cards/gallery retain their Server Component architecture and 4:5 layouts.

Cart metadata is still reconstructed from the trusted static snapshot until Task 12F.
CartLine nevertheless revalidates reference ownership through ProductImage. Wishlist
still uses static product display data. Neither static catalogue nor persisted image
metadata becomes an arbitrary URL source. Their temporary placeholder limitation is
intentional; do not update static images to hide it.

No Storage objects, bucket configuration, policies, database rows or seed SQL were
modified by this task. The reported empty bucket and live placeholder rows remain the
baseline; no privileged inspection or live write was performed.

Tests: node tests/product-image.test.mjs plus existing adapter, migration and cutover
suites. The image wrapper test simulates React state and the Image element; it is not
a real browser/network test. After authorized artwork integration, verify actual
network failure fallback and optimized Storage rendering in the browser.
