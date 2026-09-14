-- REVIEW ONLY: not applied. Execute only after a separate approved security review.
-- Requires existing Supabase auth.users, auth.uid(), anon and authenticated roles.
-- One-time initial migration: intentional failure on existing objects prevents drift
-- from being hidden by IF NOT EXISTS. No seeds, auth hooks or checkout functions.
begin;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  price_kobo bigint not null check (price_kobo >= 0),
  original_price_kobo bigint check (original_price_kobo >= 0),
  image_path text,
  images text[] not null default '{}'::text[],
  club text,
  league text,
  country text,
  category text not null check (category in (
    'home', 'away', 'third', 'goalkeeper', 'training', 'retro', 'player', 'international'
  )),
  season text not null check (length(btrim(season)) > 0),
  sizes text[] not null default '{}'::text[],
  is_new boolean not null default false,
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  in_stock boolean not null default true,
  is_active boolean not null default true,
  currency text not null default 'NGN' check (currency = 'NGN'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_discount_price check (
    original_price_kobo is null or original_price_kobo > price_kobo
  ),
  constraint products_sizes_valid check (
    cardinality(sizes) = 0 or (
      array_ndims(sizes) = 1
      and array_position(sizes, null) is null
      and sizes <@ array['XS','S','M','L','XL','2XL','3XL','4XL']::text[]
    )
  ),
  constraint products_images_valid check (
    cardinality(images) = 0 or (
      array_ndims(images) = 1 and array_position(images, null) is null
    )
  )
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  recipient_name text not null check (length(btrim(recipient_name)) > 0),
  phone text not null check (length(btrim(phone)) > 0),
  address_line_1 text not null check (length(btrim(address_line_1)) > 0),
  address_line_2 text,
  city text not null check (length(btrim(city)) > 0),
  state text not null check (length(btrim(state)) > 0),
  postal_code text,
  country text not null default 'Nigeria' check (country = 'Nigeria'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Account removal retains the order snapshot but removes customer API access.
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  currency text not null default 'NGN' check (currency = 'NGN'),
  subtotal_kobo bigint not null check (subtotal_kobo >= 0),
  delivery_fee_kobo bigint not null check (delivery_fee_kobo >= 0),
  total_kobo bigint not null check (total_kobo >= 0),
  customer_name text not null check (length(btrim(customer_name)) > 0),
  customer_email text not null check (length(btrim(customer_email)) > 0),
  customer_phone text not null check (length(btrim(customer_phone)) > 0),
  -- Independent snapshot: deliberately no FK to mutable/deletable addresses.
  delivery_recipient_name text not null check (length(btrim(delivery_recipient_name)) > 0),
  delivery_phone text not null check (length(btrim(delivery_phone)) > 0),
  delivery_address_line_1 text not null check (length(btrim(delivery_address_line_1)) > 0),
  delivery_address_line_2 text,
  delivery_city text not null check (length(btrim(delivery_city)) > 0),
  delivery_state text not null check (length(btrim(delivery_state)) > 0),
  delivery_postal_code text,
  delivery_country text not null default 'Nigeria' check (delivery_country = 'Nigeria'),
  payment_reference text unique check (length(btrim(payment_reference)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Exact numeric casts avoid bigint overflow during constraint evaluation.
  constraint orders_total_matches check (
    total_kobo::numeric = subtotal_kobo::numeric + delivery_fee_kobo::numeric
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null check (length(btrim(product_name)) > 0),
  product_slug text check (product_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  selected_size text not null check (selected_size in (
    'XS','S','M','L','XL','2XL','3XL','4XL'
  )),
  unit_price_kobo bigint not null check (unit_price_kobo >= 0),
  quantity integer not null check (quantity between 1 and 10),
  line_total_kobo bigint not null check (line_total_kobo >= 0),
  created_at timestamptz not null default now(),
  constraint order_items_total_matches check (
    line_total_kobo::numeric = unit_price_kobo::numeric * quantity::numeric
  )
);

-- slug's UNIQUE constraint already supplies its index; no duplicate slug index.
create index products_is_active_idx on public.products (is_active);
create index addresses_user_id_idx on public.addresses (user_id);
-- At most one default per user; switching defaults requires a future transaction.
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;
create index orders_user_id_idx on public.orders (user_id);
create index orders_created_at_idx on public.orders (created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

-- Invoker rights only. This trigger changes a timestamp, not ownership or prices.
create function public.jersey_store_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- Functions otherwise inherit PUBLIC EXECUTE. No client RPC is needed here.
-- The migration owner creates the triggers; runtime trigger invocation does not
-- require granting clients direct EXECUTE on this function.
revoke all on function public.jersey_store_set_updated_at() from public, anon, authenticated;

create trigger products_set_updated_at before update on public.products
  for each row execute function public.jersey_store_set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.jersey_store_set_updated_at();
create trigger addresses_set_updated_at before update on public.addresses
  for each row execute function public.jersey_store_set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.jersey_store_set_updated_at();

alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Supabase defaults differ by project. Normalize grants only on these new tables.
-- Also removes TRUNCATE/REFERENCES/TRIGGER privileges, which RLS does not cover.
-- No role elevation, schema-wide revoke or altered future-object defaults.
revoke all on table public.products, public.profiles, public.addresses,
  public.orders, public.order_items from public, anon, authenticated;

grant select on table public.products to anon, authenticated;
grant select on table public.profiles, public.addresses, public.orders,
  public.order_items to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant insert (
  user_id, label, recipient_name, phone, address_line_1, address_line_2,
  city, state, postal_code, country, is_default
) on public.addresses to authenticated;
grant update (
  label, recipient_name, phone, address_line_1, address_line_2,
  city, state, postal_code, country, is_default
) on public.addresses to authenticated;
grant delete on table public.addresses to authenticated;

create policy products_read_active on public.products
  for select to anon, authenticated
  using (is_active = true);

create policy profiles_read_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy addresses_read_own on public.addresses
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy addresses_insert_own on public.addresses
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy addresses_update_own on public.addresses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy addresses_delete_own on public.addresses
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy orders_read_own on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy order_items_read_own on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders as owning_order
    where owning_order.id = order_items.order_id
      and owning_order.user_id = (select auth.uid())
  ));

-- Intentionally absent: profile INSERT/DELETE; product/order/order-item client
-- writes; admin policies; auth signup hooks; checkout/inventory/payment routines.
-- This schema cannot yet enforce order subtotal = SUM(item snapshots) across rows.
-- Future trusted checkout must transact, lock inventory and recalculate all money.
commit;
