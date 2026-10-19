-- DRAFT ONLY: NOT APPLIED. Read docs/checkout-foundation-draft.md.
-- Requires live-schema confirmation and isolated PostgreSQL testing BEFORE use.
begin;
create role jersey_checkout_owner nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role jersey_inventory_worker nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
-- Neither role owns tables. PostgreSQL retains creator-administration
-- memberships; explicit temporary SET membership is removed below.
-- Preflight extension schema first.
create extension if not exists btree_gist with schema extensions;

create table public.nigerian_states (
  id text primary key check (id ~ '^[a-z]+(-[a-z]+)*$'), name text not null unique
);
-- Canonical application identifiers, NOT ISO codes.
insert into public.nigerian_states (id,name) values
('abia','Abia'),('adamawa','Adamawa'),('akwa-ibom','Akwa Ibom'),
('anambra','Anambra'),('bauchi','Bauchi'),('bayelsa','Bayelsa'),
('benue','Benue'),('borno','Borno'),('cross-river','Cross River'),
('delta','Delta'),('ebonyi','Ebonyi'),('edo','Edo'),('ekiti','Ekiti'),
('enugu','Enugu'),('gombe','Gombe'),('imo','Imo'),('jigawa','Jigawa'),
('kaduna','Kaduna'),('kano','Kano'),('katsina','Katsina'),('kebbi','Kebbi'),
('kogi','Kogi'),('kwara','Kwara'),('lagos','Lagos'),('nasarawa','Nasarawa'),
('niger','Niger'),('ogun','Ogun'),('ondo','Ondo'),('osun','Osun'),
('oyo','Oyo'),('plateau','Plateau'),('rivers','Rivers'),('sokoto','Sokoto'),
('taraba','Taraba'),('yobe','Yobe'),('zamfara','Zamfara'),
('fct','Federal Capital Territory');
create table public.checkout_settings (
  singleton boolean primary key default true check (singleton),
  reservation_minutes integer not null check (reservation_minutes between 1 and 60)
);
insert into public.checkout_settings values (true,15);
create table public.delivery_zones (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (pg_catalog.length(name) between 1 and 100),
  is_active boolean not null default false
);
create table public.delivery_zone_states (
  state_id text primary key references public.nigerian_states(id) on delete restrict,
  zone_id uuid not null references public.delivery_zones(id) on delete restrict
);
create index delivery_zone_states_zone_idx on public.delivery_zone_states(zone_id);
create table public.delivery_rates (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  zone_id uuid not null references public.delivery_zones(id) on delete restrict,
  service_code text not null check (service_code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  provider_code text check (provider_code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  version integer not null check (version > 0),
  fee_kobo bigint not null check (fee_kobo between 0 and 100000000),
  currency text not null default 'NGN' check (currency = 'NGN'),
  is_active boolean not null default false,
  effective_from timestamptz not null check (pg_catalog.isfinite(effective_from)),
  effective_until timestamptz,
  unique (zone_id,version),
  check (effective_until is null or (pg_catalog.isfinite(effective_until) and effective_until > effective_from)),
  -- One offered service per zone at a time; [start,end) permits adjacent rates.
  exclude using gist (zone_id extensions.gist_uuid_ops with =,
    pg_catalog.tstzrange(effective_from,effective_until,'[)') with &&) where (is_active)
);
create table public.product_variants (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  size text not null check (size in ('XS','S','M','L','XL','2XL','3XL','4XL')),
  stock_quantity integer not null check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  is_active boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  unique (product_id,size), check (reserved_quantity <= stock_quantity)
);
create trigger product_variants_set_updated_at before update on public.product_variants
for each row execute function public.jersey_store_set_updated_at();

-- An existing SKU must never be reassigned to a different product or size:
-- order/reservation FKs identify this immutable identity, not a mutable label.
create function public.checkout_variant_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.product_id is distinct from old.product_id
    or new.size is distinct from old.size then
    raise exception 'Variant identity is immutable';
  end if;
  return new;
end;
$$;
revoke all on function public.checkout_variant_guard() from public, anon, authenticated;
create trigger checkout_variant_guard before update on public.product_variants
for each row execute function public.checkout_variant_guard();

alter table public.addresses
  add column state_id text references public.nigerian_states(id) on delete restrict,
  add column delivery_instructions text check (pg_catalog.length(delivery_instructions) <= 500);
-- No guessed historical state mapping, and no expansion of customer grants.
alter table public.orders
  add column checkout_version integer check (checkout_version = 1),
  add column delivery_state_id text references public.nigerian_states(id) on delete restrict,
  add column delivery_instructions text check (pg_catalog.length(delivery_instructions) <= 500),
  add column delivery_zone_id uuid references public.delivery_zones(id) on delete restrict,
  add column delivery_zone_code text,
  add column delivery_service_code text,
  add column delivery_rate_id uuid references public.delivery_rates(id) on delete restrict,
  add column delivery_rate_version integer,
  add column reservation_expires_at timestamptz,
  add column cancelled_at timestamptz,
  add column cancellation_reason text check (cancellation_reason in ('reservation_expired','operator_cancelled')),
  add column requires_review boolean not null default false,
  add constraint checkout_order_bounds check (checkout_version is null or (
    subtotal_kobo between 1 and 1000000000 and delivery_fee_kobo between 0 and 100000000
    and total_kobo between 1 and 1000000000 and delivery_state_id is not null
    and delivery_zone_id is not null and delivery_zone_code is not null
    and delivery_service_code is not null and delivery_rate_id is not null
    and delivery_rate_version is not null and delivery_rate_version > 0
    and reservation_expires_at is not null and pg_catalog.isfinite(reservation_expires_at)
  ));
alter table public.order_items
  add column variant_id uuid references public.product_variants(id) on delete restrict,
  add constraint checkout_item_price_bounds check (variant_id is null or unit_price_kobo between 1 and 100000000);
create unique index order_items_order_variant_idx on public.order_items(order_id,variant_id) where variant_id is not null;
create index order_items_variant_idx on public.order_items(variant_id) where variant_id is not null;
create index orders_reservation_expiry_idx on public.orders(reservation_expires_at,id)
  where checkout_version = 1 and status = 'pending';
create table public.inventory_reservations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 10),
  status text not null default 'active' check (status in ('active','consumed','released','expired')),
  expires_at timestamptz not null check (pg_catalog.isfinite(expires_at)),
  created_at timestamptz not null default pg_catalog.now(), completed_at timestamptz,
  unique (order_id,variant_id),
  check ((status = 'active' and completed_at is null) or (status <> 'active' and completed_at is not null))
);
create index reservations_expiry_idx on public.inventory_reservations(expires_at,order_id) where status = 'active';
create index reservations_variant_idx on public.inventory_reservations(variant_id) where status = 'active';
create table public.checkout_requests (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null check (request_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  canonicalization_version integer not null check (canonicalization_version = 1),
  fingerprint bytea not null check (pg_catalog.octet_length(fingerprint) = 32),
  order_id uuid unique references public.orders(id) on delete restrict,
  created_at timestamptz not null default pg_catalog.now(), unique (user_id,request_key)
);

create function public.checkout_text(p_object jsonb,p_key text,p_max integer,p_required boolean)
returns text language plpgsql immutable security invoker set search_path = '' as $$
declare v pg_catalog.text;
begin
  if not (p_object ? p_key) then
    if p_required then raise exception 'Invalid checkout request'; end if;
    return null;
  end if;
  if pg_catalog.jsonb_typeof(p_object -> p_key) <> 'string' then raise exception 'Invalid checkout request'; end if;
  v := pg_catalog.btrim(p_object ->> p_key);
  if pg_catalog.length(v) > p_max or v ~ '[[:cntrl:]]' or (p_required and v = '') then
    raise exception 'Invalid checkout request';
  end if;
  return nullif(v,'');
end;
$$;
revoke all on function public.checkout_text(jsonb,text,integer,boolean) from public, anon, authenticated;
grant execute on function public.checkout_text(jsonb,text,integer,boolean) to jersey_checkout_owner;

create function public.checkout_snapshot_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_table_name = 'orders' then
    if old.checkout_version = 1 and
      (pg_catalog.to_jsonb(new) - array['status','payment_status','payment_reference','cancelled_at','cancellation_reason','requires_review','updated_at','user_id'])
      is distinct from
      (pg_catalog.to_jsonb(old) - array['status','payment_status','payment_reference','cancelled_at','cancellation_reason','requires_review','updated_at','user_id']) then
      raise exception 'Checkout snapshot is immutable';
    end if;
    if old.checkout_version = 1 and new.user_id is distinct from old.user_id and new.user_id is not null then
      raise exception 'Checkout ownership is immutable';
    end if;
  elsif old.variant_id is not null and new is distinct from old then
    raise exception 'Checkout item snapshot is immutable';
  end if;
  return new;
end;
$$;
revoke all on function public.checkout_snapshot_guard() from public, anon, authenticated;
create trigger checkout_orders_snapshot_guard before update on public.orders
for each row execute function public.checkout_snapshot_guard();
create trigger checkout_items_snapshot_guard before update on public.order_items
for each row execute function public.checkout_snapshot_guard();

-- Consumption is deliberately unavailable until the payment phase is reviewed.
create function public.checkout_reservation_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.status <> 'active' or new.status not in ('released','expired')
    or (pg_catalog.to_jsonb(new) - array['status','completed_at']) is distinct from
       (pg_catalog.to_jsonb(old) - array['status','completed_at']) then
    raise exception 'Invalid reservation transition';
  end if;
  return new;
end;
$$;
revoke all on function public.checkout_reservation_guard() from public, anon, authenticated;
create trigger checkout_reservation_guard before update on public.inventory_reservations
for each row execute function public.checkout_reservation_guard();

-- Rate identity/price is versioned, never edited in place. Closing a period or
-- disabling a rate is allowed; replacing price/service needs a new version.
create function public.checkout_rate_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (pg_catalog.to_jsonb(new) - array['is_active','effective_until']) is distinct from
     (pg_catalog.to_jsonb(old) - array['is_active','effective_until']) then
    raise exception 'Create a new delivery rate version';
  end if;
  return new;
end;
$$;
revoke all on function public.checkout_rate_guard() from public, anon, authenticated;
create trigger checkout_rate_guard before update on public.delivery_rates
for each row execute function public.checkout_rate_guard();

create function public.checkout_order_consistency() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; v_id pg_catalog.uuid; n pg_catalog.int8; units pg_catalog.int8; subtotal pg_catalog.numeric;
begin
  if tg_table_name = 'orders' then v_id := coalesce(new.id,old.id);
  else v_id := coalesce(new.order_id,old.order_id); end if;
  select * into o from public.orders where id = v_id;
  if not found or o.checkout_version is null then return null; end if;
  select pg_catalog.count(*),pg_catalog.sum(quantity),pg_catalog.sum(line_total_kobo)
    into n,units,subtotal from public.order_items where order_id = v_id;
  if n not between 1 and 20 or units not between 1 and 100 or subtotal is distinct from o.subtotal_kobo::pg_catalog.numeric
    or exists (select 1 from public.order_items i left join public.product_variants v on v.id = i.variant_id
      where i.order_id = v_id and (i.variant_id is null or i.product_id is distinct from v.product_id or i.selected_size <> v.size)) then
    raise exception 'Inconsistent checkout order';
  end if;
  if exists (
    select 1 from
      (select * from public.order_items where order_id = v_id) i
      full join (select * from public.inventory_reservations where order_id = v_id) r
        on r.variant_id = i.variant_id
      where i.id is null or r.id is null or i.quantity <> r.quantity
        or r.expires_at <> o.reservation_expires_at
  ) then raise exception 'Inconsistent checkout reservation'; end if;
  return null;
end;
$$;
revoke all on function public.checkout_order_consistency() from public, anon, authenticated;
create constraint trigger checkout_order_consistency after insert or update on public.orders
deferrable initially deferred for each row execute function public.checkout_order_consistency();
create constraint trigger checkout_item_consistency after insert or update or delete on public.order_items
deferrable initially deferred for each row execute function public.checkout_order_consistency();

-- Raw JSON text permits a byte limit before parsing; future HTTP body limits
-- also protect the outer RPC wrapper. No raw request is stored or logged.
create function public.create_checkout_order(p_request text)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  claims_text pg_catalog.text; claims pg_catalog.jsonb;
  u pg_catalog.uuid; email_claim pg_catalog.text; req pg_catalog.jsonb; delivery pg_catalog.jsonb; item pg_catalog.jsonb; snapshot pg_catalog.jsonb;
  items pg_catalog.jsonb := '[]'::pg_catalog.jsonb; snapshots pg_catalog.jsonb := '[]'::pg_catalog.jsonb; address_data pg_catalog.jsonb;
  request_key_value pg_catalog.uuid; digest_value pg_catalog.bytea; claim public.checkout_requests%rowtype;
  product public.products%rowtype; variant public.product_variants%rowtype;
  rate public.delivery_rates%rowtype; zone public.delivery_zones%rowtype;
  created_order public.orders%rowtype; saved public.addresses%rowtype;
  product_id_value pg_catalog.uuid; size_value pg_catalog.text; quantity_value pg_catalog.int4; units pg_catalog.int4 := 0;
  phone_value pg_catalog.text; state_value pg_catalog.text; state_name pg_catalog.text; recipient pg_catalog.text; city_value pg_catalog.text;
  line1 pg_catalog.text; line2 pg_catalog.text; postal pg_catalog.text; instructions pg_catalog.text;
  subtotal pg_catalog.int8 := 0; total pg_catalog.int8; minutes pg_catalog.int4; rate_time pg_catalog.timestamptz; deadline pg_catalog.timestamptz;
  locked_count pg_catalog.int4;
begin
  -- Trusted only through authenticated PostgREST request context, not p_request.
  -- This reads claims; it does not independently verify a JWT signature.
  claims_text := pg_catalog.current_setting('request.jwt.claims', true);
  if claims_text is null or claims_text ~ '^[[:space:]]*$' then raise exception 'Authentication required'; end if;
  claims := claims_text::pg_catalog.jsonb;
  if pg_catalog.jsonb_typeof(claims) is distinct from 'object' then raise exception 'Authentication required'; end if;
  -- Retained ownership policies use auth.uid(); reject legacy overrides so
  -- their identity cannot disagree with the modern claims used here.
  if nullif(pg_catalog.current_setting('request.jwt.claim', true), '') is not null
    or nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), '') is not null
    or nullif(pg_catalog.current_setting('request.jwt.claim.role', true), '') is not null
    or nullif(pg_catalog.current_setting('request.jwt.claim.email', true), '') is not null then
    raise exception 'Authentication required';
  end if;
  if pg_catalog.jsonb_typeof(claims -> 'role') is distinct from 'string'
    or (claims ->> 'role') is distinct from 'authenticated' then raise exception 'Authentication required'; end if;
  if pg_catalog.jsonb_typeof(claims -> 'sub') is distinct from 'string'
    or ((claims ->> 'sub') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') is not true then
    raise exception 'Authentication required';
  end if;
  u := (claims ->> 'sub')::pg_catalog.uuid;
  if pg_catalog.jsonb_typeof(claims -> 'email') is distinct from 'string' then raise exception 'Authentication required'; end if;
  email_claim := claims ->> 'email';
  if email_claim is null or pg_catalog.length(email_claim) not between 3 and 254 or email_claim ~ '[[:cntrl:]]' then
    raise exception 'Authentication required';
  end if;
  if p_request is null or pg_catalog.octet_length(p_request) > 32768 then raise exception 'Invalid checkout request'; end if;
  req := p_request::pg_catalog.jsonb;
  if pg_catalog.jsonb_typeof(req) <> 'object' or not (req ?& array['idempotencyKey','items','delivery'])
    or req - array['idempotencyKey','items','delivery'] <> '{}'::pg_catalog.jsonb then raise exception 'Invalid checkout request'; end if;
  if pg_catalog.jsonb_typeof(req -> 'idempotencyKey') <> 'string'
    or (req ->> 'idempotencyKey') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid checkout request';
  end if;
  request_key_value := (req ->> 'idempotencyKey')::pg_catalog.uuid;
  if pg_catalog.jsonb_typeof(req -> 'items') <> 'array' then raise exception 'Invalid checkout request'; end if;
  if pg_catalog.jsonb_array_length(req -> 'items') not between 1 and 20 then raise exception 'Invalid checkout request'; end if;
  if pg_catalog.jsonb_typeof(req -> 'delivery') <> 'object' then raise exception 'Invalid checkout request'; end if;
  -- Read the original JSON (JSONB collapses duplicates), but ONLY at allowed
  -- object positions. Never recursively traverse attacker-controlled nesting.
  if exists (select 1 from pg_catalog.json_each(p_request::pg_catalog.json)
    group by key having pg_catalog.count(*) > 1) then raise exception 'Invalid checkout request'; end if;
  if exists (
    with objects(value) as (
      select value from pg_catalog.json_each(p_request::pg_catalog.json) where key = 'delivery'
      union all
      select element.value from pg_catalog.json_each(p_request::pg_catalog.json) field
      cross join lateral pg_catalog.json_array_elements(
        case when field.key = 'items' then field.value else '[]'::pg_catalog.json end
      ) element where field.key = 'items'
    )
    select 1 from objects o where exists (
      select 1 from pg_catalog.json_each(case when pg_catalog.json_typeof(o.value) = 'object' then o.value else '{}'::pg_catalog.json end)
      group by key having pg_catalog.count(*) > 1
    )
  ) then raise exception 'Invalid checkout request'; end if;
  for item in select value from pg_catalog.jsonb_array_elements(req -> 'items') loop
    if pg_catalog.jsonb_typeof(item) <> 'object' or not (item ?& array['productId','selectedSize','quantity'])
      or item - array['productId','selectedSize','quantity'] <> '{}'::pg_catalog.jsonb
      or pg_catalog.jsonb_typeof(item -> 'productId') <> 'string'
      or (item ->> 'productId') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or pg_catalog.jsonb_typeof(item -> 'selectedSize') <> 'string'
      or (item ->> 'selectedSize') not in ('XS','S','M','L','XL','2XL','3XL','4XL')
      or pg_catalog.jsonb_typeof(item -> 'quantity') <> 'number'
      or (item ->> 'quantity') !~ '^(10|[1-9])$' then raise exception 'Invalid checkout request'; end if;
    items := items || pg_catalog.jsonb_build_array(item);
    units := units + (item ->> 'quantity')::pg_catalog.int4;
  end loop;
  if units > 100 or exists (select 1 from pg_catalog.jsonb_array_elements(items) x
    group by x ->> 'productId',x ->> 'selectedSize' having pg_catalog.count(*) > 1) then raise exception 'Invalid checkout request'; end if;
  select pg_catalog.jsonb_agg(value order by value ->> 'productId',value ->> 'selectedSize')
    into items from pg_catalog.jsonb_array_elements(items);
  delivery := req -> 'delivery';
  if pg_catalog.jsonb_typeof(delivery) <> 'object' or not (delivery ? 'kind') then raise exception 'Invalid checkout request'; end if;
  instructions := public.checkout_text(delivery,'instructions',500,false);
  if delivery ->> 'kind' = 'saved' then
    if not (delivery ? 'addressId') or delivery - array['kind','addressId','instructions'] <> '{}'::pg_catalog.jsonb
      or pg_catalog.jsonb_typeof(delivery -> 'addressId') <> 'string'
      or (delivery ->> 'addressId') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid checkout request'; end if;
    delivery := pg_catalog.jsonb_build_object('kind','saved','addressId',delivery ->> 'addressId','instructions',instructions);
  elsif delivery ->> 'kind' = 'one-off' then
    if delivery - array['kind','recipientName','phone','addressLine1','addressLine2','city','stateId','postalCode','instructions'] <> '{}'::pg_catalog.jsonb then raise exception 'Invalid checkout request'; end if;
    recipient := public.checkout_text(delivery,'recipientName',100,true);
    phone_value := public.checkout_text(delivery,'phone',14,true);
    line1 := public.checkout_text(delivery,'addressLine1',200,true);
    line2 := public.checkout_text(delivery,'addressLine2',200,false);
    city_value := public.checkout_text(delivery,'city',100,true);
    state_value := public.checkout_text(delivery,'stateId',30,true);
    postal := public.checkout_text(delivery,'postalCode',6,false);
    if phone_value !~ '^(0|\+234)[789][0-9]{9}$' or (postal is not null and postal !~ '^[0-9]{6}$') then raise exception 'Invalid checkout request'; end if;
    if pg_catalog.left(phone_value,1) = '0' then phone_value := '+234' || pg_catalog.substr(phone_value,2); end if;
    delivery := pg_catalog.jsonb_build_object('kind','one-off','recipientName',recipient,'phone',phone_value,
      'addressLine1',line1,'addressLine2',line2,'city',city_value,'stateId',state_value,'postalCode',postal,'instructions',instructions);
  else raise exception 'Invalid checkout request'; end if;
  -- Version 1: trimmed text, canonical phone, sorted lines, JSONB serialization.
  -- Check replay BEFORE resolving an edited/deleted saved address or new prices.
  digest_value := pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object('version',1,'items',items,'delivery',delivery)::pg_catalog.text,'UTF8'));
  insert into public.checkout_requests(user_id,request_key,canonicalization_version,fingerprint)
    values(u,request_key_value,1,digest_value) on conflict (user_id,request_key) do nothing;
  select * into strict claim from public.checkout_requests where user_id = u and request_key = request_key_value for update;
  if claim.fingerprint <> digest_value or claim.canonicalization_version <> 1 then raise exception 'Checkout request conflicts'; end if;
  if claim.order_id is not null then
    select * into strict created_order from public.orders where id = claim.order_id and user_id = u;
    return pg_catalog.jsonb_build_object('orderId',created_order.id,'totalKobo',created_order.total_kobo,'currency','NGN','status',created_order.status);
  end if;
  if delivery ->> 'kind' = 'saved' then
    select * into strict saved from public.addresses where id = (delivery ->> 'addressId')::pg_catalog.uuid and user_id = u;
    address_data := pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object('recipientName',saved.recipient_name,
      'phone',saved.phone,'addressLine1',saved.address_line_1,'addressLine2',saved.address_line_2,
      'city',saved.city,'stateId',saved.state_id,'postalCode',saved.postal_code));
    recipient := public.checkout_text(address_data,'recipientName',100,true);
    phone_value := public.checkout_text(address_data,'phone',14,true);
    line1 := public.checkout_text(address_data,'addressLine1',200,true);
    line2 := public.checkout_text(address_data,'addressLine2',200,false);
    city_value := public.checkout_text(address_data,'city',100,true);
    state_value := public.checkout_text(address_data,'stateId',30,true);
    postal := public.checkout_text(address_data,'postalCode',6,false);
    if saved.country <> 'Nigeria' or phone_value !~ '^(0|\+234)[789][0-9]{9}$'
      or (postal is not null and postal !~ '^[0-9]{6}$') then raise exception 'Invalid checkout request'; end if;
    if pg_catalog.left(phone_value,1) = '0' then phone_value := '+234' || pg_catalog.substr(phone_value,2); end if;
  end if;
  select name into strict state_name from public.nigerian_states where id = state_value;
  select z.* into strict zone from public.delivery_zone_states s join public.delivery_zones z on z.id = s.zone_id
    where s.state_id = state_value and z.is_active for share of s,z;
  select reservation_minutes into strict minutes from public.checkout_settings where singleton for share;
  rate_time := pg_catalog.clock_timestamp();
  select * into strict rate from public.delivery_rates where zone_id = zone.id and is_active
    and effective_from <= rate_time and (effective_until is null or effective_until > rate_time) for share;
  -- Global locking order: product UUIDs, then variant UUIDs. Re-read under locks.
  perform p.id from public.products p where p.id in
    (select (value ->> 'productId')::pg_catalog.uuid from pg_catalog.jsonb_array_elements(items)) order by p.id for share;
  get diagnostics locked_count = row_count;
  if locked_count <> (select pg_catalog.count(distinct value ->> 'productId') from pg_catalog.jsonb_array_elements(items)) then
    raise exception 'Checkout unavailable';
  end if;
  perform v.id from public.product_variants v join pg_catalog.jsonb_array_elements(items) x
    on v.product_id = (x ->> 'productId')::pg_catalog.uuid and v.size = x ->> 'selectedSize' order by v.id for update of v;
  get diagnostics locked_count = row_count;
  if locked_count <> pg_catalog.jsonb_array_length(items) then raise exception 'Checkout unavailable'; end if;
  for item in select value from pg_catalog.jsonb_array_elements(items) loop
    product_id_value := (item ->> 'productId')::pg_catalog.uuid; size_value := item ->> 'selectedSize'; quantity_value := (item ->> 'quantity')::pg_catalog.int4;
    select * into strict product from public.products where id = product_id_value;
    select * into strict variant from public.product_variants where product_id = product_id_value and size = size_value;
    if not product.is_active or not product.in_stock or not (size_value = any(product.sizes))
      or product.currency <> 'NGN' or product.price_kobo not between 1 and 100000000
      or not variant.is_active or variant.stock_quantity - variant.reserved_quantity < quantity_value then raise exception 'Checkout unavailable'; end if;
    subtotal := subtotal + product.price_kobo * quantity_value;
    snapshots := snapshots || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('variant',variant.id,
      'product',product.id,'name',product.name,'slug',product.slug,'size',size_value,'quantity',quantity_value,'price',product.price_kobo));
  end loop;
  total := subtotal + rate.fee_kobo;
  if total > 1000000000 then raise exception 'Checkout unavailable'; end if;
  -- Lock waits can cross the rate's end boundary. Authorize the snapshot at
  -- this final pricing instant, not at the earlier lookup/request timestamp.
  rate_time := pg_catalog.clock_timestamp();
  if rate.effective_from > rate_time or (rate.effective_until is not null and rate.effective_until <= rate_time) then
    raise exception 'Checkout unavailable';
  end if;
  deadline := rate_time + pg_catalog.make_interval(mins => minutes);
  insert into public.orders(user_id,checkout_version,subtotal_kobo,delivery_fee_kobo,total_kobo,
    customer_name,customer_email,customer_phone,delivery_recipient_name,delivery_phone,
    delivery_address_line_1,delivery_address_line_2,delivery_city,delivery_state,delivery_state_id,
    delivery_postal_code,delivery_instructions,delivery_zone_id,delivery_zone_code,delivery_service_code,
    delivery_rate_id,delivery_rate_version,reservation_expires_at)
  values(u,1,subtotal,rate.fee_kobo,total,recipient,email_claim,phone_value,recipient,phone_value,
    line1,line2,city_value,state_name,state_value,postal,instructions,zone.id,zone.code,
    rate.service_code,rate.id,rate.version,deadline) returning * into created_order;
  for snapshot in select value from pg_catalog.jsonb_array_elements(snapshots) loop
    product_id_value := (snapshot ->> 'variant')::pg_catalog.uuid; quantity_value := (snapshot ->> 'quantity')::pg_catalog.int4;
    insert into public.order_items(order_id,variant_id,product_id,product_name,product_slug,selected_size,unit_price_kobo,quantity,line_total_kobo)
      values(created_order.id,product_id_value,(snapshot ->> 'product')::pg_catalog.uuid,snapshot ->> 'name',snapshot ->> 'slug',snapshot ->> 'size',
        (snapshot ->> 'price')::pg_catalog.int8,quantity_value,(snapshot ->> 'price')::pg_catalog.int8 * quantity_value);
    insert into public.inventory_reservations(order_id,variant_id,quantity,expires_at)
      values(created_order.id,product_id_value,quantity_value,deadline);
    update public.product_variants set reserved_quantity = reserved_quantity + quantity_value
      where id = product_id_value and stock_quantity - reserved_quantity >= quantity_value;
    if not found then raise exception 'Checkout unavailable'; end if;
  end loop;
  update public.checkout_requests set order_id = created_order.id where id = claim.id;
  return pg_catalog.jsonb_build_object('orderId',created_order.id,'totalKobo',total,'currency','NGN','status',created_order.status);
exception when others then
  -- No SQLERRM/DETAIL, addresses, request text or auth claims in public failures.
  raise exception 'Checkout could not be completed' using errcode = 'P0001';
end;
$$;
revoke all on function public.create_checkout_order(text) from public, anon, authenticated;

-- Worker only: NULL order = expired batch; explicit order = operator cancellation.
create function public.release_checkout_reservations(p_order_id uuid default null,p_limit integer default 50)
returns integer language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare o public.orders%rowtype; r public.inventory_reservations%rowtype;
  ids pg_catalog.uuid[]; affected pg_catalog.int4 := 0; observed_at pg_catalog.timestamptz := pg_catalog.clock_timestamp();
begin
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid batch limit'; end if;
  select pg_catalog.array_agg(id) into ids from (
    select id from public.orders where checkout_version = 1 and status = 'pending'
      and (p_order_id is not null or not requires_review)
      and ((p_order_id is null and reservation_expires_at <= observed_at) or id = p_order_id)
    order by id limit p_limit for update skip locked
  ) batch;
  if ids is null then return 0; end if;
  -- Lock ALL batch variants globally, rather than separately per order.
  perform v.id from public.product_variants v where v.id in
    (select variant_id from public.inventory_reservations where order_id = any(ids) and status = 'active')
    order by v.id for update;
  for o in select * from public.orders where id = any(ids) order by id loop
    if o.payment_status not in ('unpaid','failed') then
      update public.orders set requires_review = true where id = o.id;
      continue;
    end if;
    for r in select * from public.inventory_reservations where order_id = o.id and status = 'active'
      order by variant_id for update loop
      update public.product_variants set reserved_quantity = reserved_quantity - r.quantity
        where id = r.variant_id and reserved_quantity >= r.quantity;
      if not found then raise exception 'Reservation invariant failed'; end if;
      update public.inventory_reservations set status = case when p_order_id is null then 'expired' else 'released' end,
        completed_at = observed_at where id = r.id and status = 'active';
      if not found then raise exception 'Reservation invariant failed'; end if;
    end loop;
    update public.orders set status = 'cancelled',cancelled_at = observed_at,
      cancellation_reason = case when p_order_id is null then 'reservation_expired' else 'operator_cancelled' end where id = o.id;
    affected := affected + 1;
  end loop;
  return affected;
exception when others then raise exception 'Reservation release could not be completed' using errcode = 'P0001';
end;
$$;
revoke all on function public.release_checkout_reservations(uuid,integer) from public, anon, authenticated;

-- Existing customer ownership policies/grants remain unchanged.
alter table public.nigerian_states enable row level security;
alter table public.checkout_settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.delivery_zone_states enable row level security;
alter table public.delivery_rates enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.checkout_requests enable row level security;
revoke all on public.nigerian_states, public.checkout_settings, public.delivery_zones,
  public.delivery_zone_states, public.delivery_rates, public.product_variants,
  public.inventory_reservations, public.checkout_requests from public, anon, authenticated;
grant select on public.nigerian_states to anon, authenticated;
create policy states_read on public.nigerian_states for select to anon, authenticated, jersey_checkout_owner using (true);
create policy settings_read on public.checkout_settings for select to jersey_checkout_owner using (true);
create policy zones_read on public.delivery_zones for select to jersey_checkout_owner using (true);
create policy coverage_read on public.delivery_zone_states for select to jersey_checkout_owner using (true);
create policy rates_read on public.delivery_rates for select to jersey_checkout_owner using (true);
create policy variants_read on public.product_variants for select to jersey_checkout_owner, jersey_inventory_worker using (true);
create policy variants_counter on public.product_variants for update to jersey_checkout_owner, jersey_inventory_worker using (true) with check (true);
create policy checkout_products_read on public.products for select to jersey_checkout_owner using (true);
create policy checkout_addresses_read on public.addresses for select to jersey_checkout_owner using (user_id = (select auth.uid()));
create policy checkout_orders_read on public.orders for select to jersey_checkout_owner using (user_id = (select auth.uid()));
create policy checkout_orders_insert on public.orders for insert to jersey_checkout_owner with check (user_id = (select auth.uid()) and checkout_version = 1 and status = 'pending' and payment_status = 'unpaid');
create policy checkout_items_read on public.order_items for select to jersey_checkout_owner using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy checkout_items_insert on public.order_items for insert to jersey_checkout_owner with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()) and o.checkout_version = 1));
create policy checkout_reservations_read on public.inventory_reservations for select to jersey_checkout_owner using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy checkout_reservations_insert on public.inventory_reservations for insert to jersey_checkout_owner with check (status = 'active' and exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()) and o.checkout_version = 1));
create policy requests_read on public.checkout_requests for select to jersey_checkout_owner using (user_id = (select auth.uid()));
create policy requests_insert on public.checkout_requests for insert to jersey_checkout_owner with check (user_id = (select auth.uid()));
create policy requests_link on public.checkout_requests for update to jersey_checkout_owner using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy worker_orders_read on public.orders for select to jersey_inventory_worker using (checkout_version = 1);
create policy worker_orders_update on public.orders for update to jersey_inventory_worker using (checkout_version = 1) with check (checkout_version = 1);
create policy worker_items_read on public.order_items for select to jersey_inventory_worker using (exists (select 1 from public.orders o where o.id = order_id and o.checkout_version = 1));
create policy worker_reservations_read on public.inventory_reservations for select to jersey_inventory_worker using (true);
create policy worker_reservations_update on public.inventory_reservations for update to jersey_inventory_worker using (status = 'active') with check (status in ('released','expired'));
-- FOR SHARE needs UPDATE rights; only lock-key columns, no such UPDATE in RPC.
create policy settings_lock on public.checkout_settings for update to jersey_checkout_owner using (true) with check (true);
create policy zones_lock on public.delivery_zones for update to jersey_checkout_owner using (true) with check (true);
create policy coverage_lock on public.delivery_zone_states for update to jersey_checkout_owner using (true) with check (true);
create policy rates_lock on public.delivery_rates for update to jersey_checkout_owner using (true) with check (true);
create policy products_lock on public.products for update to jersey_checkout_owner using (true) with check (true);
grant usage on schema public to jersey_checkout_owner;
grant usage on schema public to jersey_inventory_worker;
-- Retained resolved auth.uid() policies remain a disposable runtime-verification
-- gate. Preserve helper EXECUTE; do not require managed auth schema USAGE.
grant execute on function auth.uid(), auth.role(), auth.jwt() to jersey_checkout_owner;
grant select on public.nigerian_states, public.checkout_settings, public.delivery_zones, public.delivery_zone_states,
  public.delivery_rates, public.products, public.product_variants, public.addresses,
  public.orders, public.order_items, public.inventory_reservations, public.checkout_requests to jersey_checkout_owner;
grant update (singleton) on public.checkout_settings to jersey_checkout_owner;
grant update (id) on public.delivery_zones, public.delivery_rates, public.products to jersey_checkout_owner;
grant update (state_id) on public.delivery_zone_states to jersey_checkout_owner;
grant update (reserved_quantity) on public.product_variants to jersey_checkout_owner, jersey_inventory_worker;
grant insert on public.orders, public.order_items, public.inventory_reservations, public.checkout_requests to jersey_checkout_owner;
grant update (order_id) on public.checkout_requests to jersey_checkout_owner;
grant select on public.orders, public.order_items, public.product_variants, public.inventory_reservations to jersey_inventory_worker;
grant update (status,cancelled_at,cancellation_reason,requires_review) on public.orders to jersey_inventory_worker;
grant update (status,completed_at) on public.inventory_reservations to jersey_inventory_worker;
-- Function owners do not own tables. Deferred checks need a definer because
-- they can fire AFTER the RPC has returned to the less privileged caller.
-- Finalize customer execution rights while postgres owns these functions.
revoke all on function public.create_checkout_order(text)
  from public, anon, authenticated;
grant execute on function public.create_checkout_order(text)
  to authenticated;

revoke all on function public.release_checkout_reservations(uuid,integer)
  from public, anon, authenticated;
revoke all on function public.checkout_order_consistency()
  from public, anon, authenticated;

-- Temporary SET capability only, attributed explicitly for precise cleanup.
-- The separate creator-administration membership is not changed.
grant jersey_checkout_owner, jersey_inventory_worker
  to postgres
  with admin false, inherit false, set true
  granted by postgres;

grant create on schema public
  to jersey_checkout_owner, jersey_inventory_worker;

alter function public.create_checkout_order(text)
  owner to jersey_checkout_owner;
alter function public.release_checkout_reservations(uuid,integer)
  owner to jersey_inventory_worker;
alter function public.checkout_order_consistency()
  owner to jersey_inventory_worker;

revoke create on schema public
  from jersey_checkout_owner, jersey_inventory_worker;

revoke jersey_checkout_owner, jersey_inventory_worker
  from postgres
  granted by postgres
  restrict;
-- No worker membership here: later provisioning grants only this function to a
-- dedicated trusted worker caller, NEVER authenticator, anon or authenticated.
commit;
