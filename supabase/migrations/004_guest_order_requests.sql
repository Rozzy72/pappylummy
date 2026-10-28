-- Prepared migration: apply only after review and database verification.
begin;
create table public.guest_order_requests (
 id uuid primary key default gen_random_uuid(),
 request_key uuid not null unique,
 request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
 status text not null default 'awaiting_payment' check (status in ('awaiting_payment','cancelled')),
 currency text not null default 'NGN' check (currency='NGN'),
 delivery jsonb not null,
 items jsonb not null,
 subtotal_kobo bigint not null check (subtotal_kobo between 1 and 1000000000),
 delivery_fee_kobo bigint not null check (delivery_fee_kobo in (200000,500000)),
 total_kobo bigint not null check (total_kobo=subtotal_kobo+delivery_fee_kobo),
 created_at timestamptz not null default now()
);
alter table public.guest_order_requests enable row level security;
revoke all on public.guest_order_requests from public,anon,authenticated;
grant select,insert on public.guest_order_requests to service_role;
create index guest_order_requests_email_created on public.guest_order_requests ((delivery->>'email'),created_at);
create function public.save_guest_order_request(p_key uuid,p_fingerprint text,p_delivery jsonb,p_items jsonb,p_expected_total bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 existing public.guest_order_requests%rowtype;
 product public.products%rowtype;
 item jsonb; snapshot jsonb; snapshots jsonb:='[]'::jsonb;
 subtotal bigint:=0; fee bigint; unit bigint; qty integer; units integer:=0;
 ref uuid; state_name text; email_address text; print jsonb;
begin
 if p_key is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' or pg_catalog.jsonb_typeof(p_delivery) is distinct from 'object' or pg_catalog.jsonb_typeof(p_items) is distinct from 'array' or pg_catalog.jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Invalid request';end if;
 email_address:=p_delivery->>'email';state_name:=p_delivery->>'state';
 if email_address is null or length(email_address)>254 or email_address !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or nullif(btrim(p_delivery->>'name'),'') is null or length(p_delivery->>'name')>100 or nullif(btrim(p_delivery->>'address'),'') is null or length(p_delivery->>'address')>200 or nullif(btrim(p_delivery->>'city'),'') is null or length(p_delivery->>'city')>100 or (p_delivery->>'phone') is null or (p_delivery->>'phone') !~ '^\+?[0-9]{7,15}$' then raise exception 'Invalid delivery';end if;
 if state_name is null or not (state_name=any(array['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT (Abuja)','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'])) then raise exception 'Invalid destination';end if;
 -- Serialize matching requests and email quotas; no browser role may execute this function.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key::text,0));
 select * into existing from public.guest_order_requests where request_key=p_key;
 if found then
  if existing.request_fingerprint is distinct from p_fingerprint then raise exception 'Request changed';end if;
  return pg_catalog.jsonb_build_object('reference',existing.id,'total_kobo',existing.total_kobo);
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(email_address,1));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('guest_order_requests_global',2));
 if (select count(*) from public.guest_order_requests where created_at>pg_catalog.now()-interval '1 hour')>=100 then raise exception 'Request limit';end if;
 if (select count(*) from public.guest_order_requests where delivery->>'email'=email_address and created_at>pg_catalog.now()-interval '1 hour')>=5 then raise exception 'Request limit';end if;
 for item in select value from pg_catalog.jsonb_array_elements(p_items) loop
  if pg_catalog.jsonb_typeof(item) is distinct from 'object' or (item->>'quantity') is null or (item->>'quantity') !~ '^[0-9]{1,2}$' then raise exception 'Invalid line';end if;
  qty:=(item->>'quantity')::integer;units:=units+qty;
  if qty not between 1 and 10 or units>100 then raise exception 'Invalid quantity';end if;
  select * into product from public.products where id=(item->>'productId')::uuid for share;
  if not found or not product.is_active or not product.in_stock or product.currency<>'NGN' or (item->>'selectedSize') is null or not ((item->>'selectedSize')=any(product.sizes)) then raise exception 'Unavailable selection';end if;
  if (select coalesce(sum((value->>'quantity')::integer),0) from pg_catalog.jsonb_array_elements(p_items) where value->>'productId'=item->>'productId' and value->>'selectedSize'=item->>'selectedSize')>10 then raise exception 'Quantity limit';end if;
  unit:=product.price_kobo;print:=item->'personalization';
  if print is not null then
   if pg_catalog.jsonb_typeof(print) is distinct from 'object' or nullif(btrim(print->>'name'),'') is null or length(print->>'name')>16 or (print->>'number') is null or (print->>'number') !~ '^[0-9]{1,2}$' or (print->>'font') is null or (print->>'font') not in ('Classic','Modern','Bold') then raise exception 'Invalid printing';end if;
   unit:=unit+500000;
  end if;
  if unit not between 1 and 100000000 then raise exception 'Invalid price';end if;
  subtotal:=subtotal+unit*qty;
  snapshot:=pg_catalog.jsonb_build_object('productId',product.id,'name',product.name,'slug',product.slug,'size',item->>'selectedSize','quantity',qty,'unitPriceKobo',unit,'personalization',print);
  snapshots:=snapshots||pg_catalog.jsonb_build_array(snapshot);
 end loop;
 fee:=case when state_name='Osun' then 200000 else 500000 end;
 if subtotal+fee>1000000000 or p_expected_total is distinct from subtotal+fee then raise exception 'Quote changed';end if;
 insert into public.guest_order_requests(request_key,request_fingerprint,delivery,items,subtotal_kobo,delivery_fee_kobo,total_kobo)
 values(p_key,p_fingerprint,p_delivery,snapshots,subtotal,fee,subtotal+fee) returning id into ref;
 return pg_catalog.jsonb_build_object('reference',ref,'total_kobo',subtotal+fee);
end;
$$;
revoke all on function public.save_guest_order_request(uuid,text,jsonb,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.save_guest_order_request(uuid,text,jsonb,jsonb,bigint) to service_role;
commit;
