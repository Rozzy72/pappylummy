# Controlled product seed

Prepared locally; not executed. This is catalogue data, not a schema migration.
Use manual trusted Supabase SQL Editor execution after reviewing the existing schema
and this seed. Browser product writes remain denied. No credentials are required in
these files.

## Stable IDs and money

These UUIDs were assigned once and are literal constants in the seed. Keep them fixed.
The frontend still uses the original IDs; cart and wishlist are unchanged. A later
application migration must use this mapping to reconcile persisted IDs.
All amounts below are Naira → integer kobo (multiply by 100). Missing optional
club/league/country values become NULL; images and all merchandising flags are preserved.
Currency is NGN and is_active is true for every row, including the out-of-stock product.

| Static ID | Fixed UUID | Slug | Price: Naira → kobo | Original: Naira → kobo |
| --- | --- | --- | --- | --- |
| jersey-001 | 423bb850-23f3-493f-a3c1-5b03c2096f93 | nigeria-home | 32000 → 3200000 | 36000 → 3600000 |
| jersey-002 | 698ac8ab-fc88-4dd8-a403-23c0fb13af7d | arsenal-home | 35000 → 3500000 | absent → NULL |
| jersey-003 | 2b7406a9-e38c-443b-92c5-3b980ffdc42a | chelsea-away | 30000 → 3000000 | 34000 → 3400000 |
| jersey-004 | 65d16266-be4a-4ac7-a19c-1b18495ee69c | manchester-united-home | 33000 → 3300000 | absent → NULL |
| jersey-005 | fa09893e-6a0c-45d2-a353-24026ab3d4b8 | liverpool-home | 34000 → 3400000 | absent → NULL |
| jersey-006 | 3967aaf4-83c6-4f9e-ac7e-7196740ebcac | manchester-city-third | 28000 → 2800000 | 32000 → 3200000 |
| jersey-007 | 28994dcb-c17b-4618-975b-d26efa8cbbf3 | barcelona-home | 36000 → 3600000 | absent → NULL |
| jersey-008 | 6cb862e8-9f7c-438f-b2fa-7fcbf155c8f4 | real-madrid-player | 42000 → 4200000 | 45000 → 4500000 |
| jersey-009 | c843f7c8-8506-4993-98a2-2def6d9d4e57 | ac-milan-home | 29000 → 2900000 | 33000 → 3300000 |
| jersey-010 | 4f01d219-1bf8-4bc7-aa19-b4f4cc377ea5 | bayern-munich-home | 35000 → 3500000 | absent → NULL |
| jersey-011 | e006008a-f14a-4cc3-ac28-8fd0c7afe687 | nigeria-retro | 38000 → 3800000 | absent → NULL |
| jersey-012 | c3a2afe2-cc30-4839-b081-70bdac68bfdf | brazil-international | 31000 → 3100000 | 35000 → 3500000 |

## Execution and verification

1. Review supabase/seeds/001_products.sql against src/data/products.ts and the applied schema.
2. Confirm the intended project and that no seeded UUID or slug already exists.
3. Run the complete seed manually in the trusted SQL Editor after approval. The single
   INSERT is wrapped in BEGIN/COMMIT. Any duplicate ID/slug or constraint failure aborts
   the transaction; nothing is overwritten. After an error, roll back any open transaction
   and investigate instead of changing the seed to ignore conflicts.
4. After COMMIT, the included SELECT inspects committed database state and returns
   the eight requested fields plus seeded_product_count, ordered by slug. Expect exactly 12 rows, each count 12. It selects only the exact
   UUID/slug pairs, so unrelated existing products are not counted. This does not assert
   that the entire products table contains only 12 rows.
5. To verify after commit, rerun only that SELECT, not the INSERT. Compare names, kobo
   prices, flags and IDs with this report. All 12 must be active; AC Milan remains
   out of stock. The storefront continues reading static data until a separate task.

## Rollback and cleanup

Before committing an interactive transaction, use ROLLBACK to cancel it. After the
complete seed has committed, ROLLBACK alone cannot undo it. Review the exact 12 pairs
and verify these rows have not been edited or used before considering cleanup. If
products have changed or orders reference them, stop and plan a separate reviewed
reversal; do not remove order history.

The following optional manual cleanup targets only matching UUID AND slug pairs.
It deletes nothing if any of these IDs has an order_items reference. Table locks keep
that check stable and temporarily block writes, so use only during a controlled
maintenance window. The default ROLLBACK makes this a dry run. After reviewing all
returned rows and confirming all 12 are intended, rerun with the final ROLLBACK
replaced by COMMIT only if cleanup is approved. Partial or zero results require
investigation. Never run cleanup as part of seed execution.

```sql
BEGIN;
-- Prevent concurrent catalogue/order writes while reviewing this cleanup.
LOCK TABLE public.products, public.order_items IN SHARE ROW EXCLUSIVE MODE;
WITH expected(id, slug) AS (
  VALUES
  ('423bb850-23f3-493f-a3c1-5b03c2096f93'::uuid, 'nigeria-home'),
  ('698ac8ab-fc88-4dd8-a403-23c0fb13af7d'::uuid, 'arsenal-home'),
  ('2b7406a9-e38c-443b-92c5-3b980ffdc42a'::uuid, 'chelsea-away'),
  ('65d16266-be4a-4ac7-a19c-1b18495ee69c'::uuid, 'manchester-united-home'),
  ('fa09893e-6a0c-45d2-a353-24026ab3d4b8'::uuid, 'liverpool-home'),
  ('3967aaf4-83c6-4f9e-ac7e-7196740ebcac'::uuid, 'manchester-city-third'),
  ('28994dcb-c17b-4618-975b-d26efa8cbbf3'::uuid, 'barcelona-home'),
  ('6cb862e8-9f7c-438f-b2fa-7fcbf155c8f4'::uuid, 'real-madrid-player'),
  ('c843f7c8-8506-4993-98a2-2def6d9d4e57'::uuid, 'ac-milan-home'),
  ('4f01d219-1bf8-4bc7-aa19-b4f4cc377ea5'::uuid, 'bayern-munich-home'),
  ('e006008a-f14a-4cc3-ac28-8fd0c7afe687'::uuid, 'nigeria-retro'),
  ('c3a2afe2-cc30-4839-b081-70bdac68bfdf'::uuid, 'brazil-international')
)
DELETE FROM public.products AS p
USING expected AS e
WHERE p.id = e.id AND p.slug = e.slug
  AND NOT EXISTS (
    SELECT 1 FROM public.order_items AS oi
    JOIN expected AS saved ON saved.id = oi.product_id
  )
RETURNING p.id, p.slug;
-- Review returned rows. COMMIT only if exactly the intended rows were removed.
ROLLBACK;
```
