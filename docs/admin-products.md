# Product and inventory administration

Open /admin/products from Account or Order requests. Every list, detail and mutation requires the existing verified server-side admin allowlist. No public or authenticated database write policies were added.

Admins can create jerseys, edit names/slugs/descriptions, set NGN prices and optional original prices, choose category/season/club/league/country, update available sizes, toggle stock availability and shop visibility, and set existing merchandising flags. New jerseys default hidden and unavailable. Photo upload accepts one WebP under 750 KB in the existing product-images bucket; replacements receive unique paths. Existing photos are retained when no replacement is selected. Missing photos use the existing placeholder. Upload validation checks MIME, size and WebP container signature.

Inventory currently means size availability and an in-stock flag. Unit counts, automatic deduction, stock reservations and fulfilment are not implemented. Prices are converted to integer kobo on the server. Existing unpaid requests retain their saved price snapshots. Edits use an updated_at condition to reject stale overwrites. Hide jerseys rather than deleting them.

Verified locally: created hidden Synthetic Admin Jersey Test (1c88409e-1975-42fb-9ba7-188344ddcc89), changed price from 12345.67 to 15000 naira, updated sizes to L/XL, changed to out of stock, and uploaded a tiny synthetic WebP fixture. The test jersey remains hidden and unavailable. Real catalogue product prices were not changed. Payments remain disabled.
