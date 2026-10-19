import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Static draft contract tests, NOT PostgreSQL execution/concurrency evidence.
const raw = readFileSync(new URL('../supabase/migrations/003_checkout_foundation_draft.sql', import.meta.url), 'utf8');
const normalizeSql = source => source.replace(/--[^\n]*/g, '').toLowerCase()
  .replace(/\b(?:grant|revoke|alter function)\s+[^;]+;/g, statement => statement.replace(/\s+/g, ' '));
const sql = normalizeSql(raw);
const initial = readFileSync(new URL('../supabase/migrations/001_initial_schema.sql', import.meta.url), 'utf8').toLowerCase();
// Separate extraction avoids reliance on semicolons within PL/pgSQL bodies.
const body = name => {
  const start = sql.indexOf(`create function public.${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  const end = sql.indexOf('$$;', start);
  assert.ok(end > start);
  return sql.slice(start, end + 3);
};
const checkout = body('create_checkout_order');
const worker = body('release_checkout_reservations');
const grants = source => source.match(/\bgrant\s+[^;]+;/g) ?? [];
const customerGrants = source => grants(source).filter(g => {
  const roles = g.split(/\bto\s+/).at(-1).replace(/;$/, '').split(',').map(r => r.trim());
  return roles.some(r => ['public','anon','authenticated'].includes(r));
});
const safeCustomerGrants = source => customerGrants(source).every(g => [
  'grant select on public.nigerian_states to anon, authenticated;',
  'grant execute on function public.create_checkout_order(text) to authenticated;',
].includes(g));

// An exact administrative suffix is intentional: any new authority or ordering
// requires review. This checks source contracts, not PostgreSQL execution.
const transferStatements = [
  'revoke all on function public.create_checkout_order(text) from public, anon, authenticated;',
  'grant execute on function public.create_checkout_order(text) to authenticated;',
  'revoke all on function public.release_checkout_reservations(uuid,integer) from public, anon, authenticated;',
  'revoke all on function public.checkout_order_consistency() from public, anon, authenticated;',
  'grant jersey_checkout_owner, jersey_inventory_worker to postgres with admin false, inherit false, set true granted by postgres;',
  'grant create on schema public to jersey_checkout_owner, jersey_inventory_worker;',
  'alter function public.create_checkout_order(text) owner to jersey_checkout_owner;',
  'alter function public.release_checkout_reservations(uuid,integer) owner to jersey_inventory_worker;',
  'alter function public.checkout_order_consistency() owner to jersey_inventory_worker;',
  'revoke create on schema public from jersey_checkout_owner, jersey_inventory_worker;',
  'revoke jersey_checkout_owner, jersey_inventory_worker from postgres granted by postgres restrict;',
];
const safeOwnershipTransfer = source => {
  const normalized = normalizeSql(source);
  const statements = normalized.slice(normalized.lastIndexOf('$$;') + 3)
    .split(';').map(s => s.trim()).filter(Boolean).map(s => s.replace(/\s+/g, ' ') + ';');
  const expected = [...transferStatements, 'commit;'];
  const membershipGrants = grants(normalized).filter(s => !/\bon\b/.test(s));
  const schemaGrants = grants(normalized).filter(s => /\bon schema\b/.test(s) && /\bcreate\b/.test(s));
  return JSON.stringify(statements.slice(-expected.length)) === JSON.stringify(expected)
    && JSON.stringify(membershipGrants) === JSON.stringify([transferStatements[4]])
    && JSON.stringify(schemaGrants) === JSON.stringify([transferStatements[5]])
    && ['jersey_checkout_owner','jersey_inventory_worker'].every(role =>
      normalized.includes(`create role ${role} nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;`))
    && !/\balter role\b|\balter user\b|\bset role\b|\bset session authorization\b|\brevoke\b[^;]*\bcascade\b|alter table[^;]*owner to/.test(normalized);
};

test('temporary membership and ACL/schema privileges follow the reviewed transfer and cleanup sequence', () => {
  assert.ok(safeOwnershipTransfer(raw));
});

test('membership mutations cannot broaden recipients, options or grantor', () => {
  for (const recipient of ['anon','authenticated','authenticator','postgres, authenticated']) {
    assert.equal(safeOwnershipTransfer(sql.replace(transferStatements[4], transferStatements[4].replace('to postgres', `to ${recipient}`))), false);
  }
  for (const [before,after] of [
    ['admin false','admin true'], ['inherit false','inherit true'], ['set true','set false'],
    ['admin false, ', ''], ['inherit false, ', ''], [', set true', ''],
    [' granted by postgres',''], ['granted by postgres','granted by supabase_admin'],
  ]) {
    assert.equal(safeOwnershipTransfer(sql.replace(transferStatements[4], transferStatements[4].replace(before,after))), false);
  }
  for (const recipient of ['anon','authenticated','authenticator','postgres']) {
    assert.equal(safeOwnershipTransfer(sql + `\ngrant jersey_inventory_worker to ${recipient};`), false);
  }
});

test('cleanup mutations reject permanent membership, wrong grantors, CASCADE and late cleanup', () => {
  const cleanup = transferStatements[10];
  for (const replacement of ['', cleanup.replace(' restrict',''), cleanup.replace('restrict','cascade'),
    cleanup.replace('granted by postgres','granted by supabase_admin'), cleanup.replace(' granted by postgres','')]) {
    assert.equal(safeOwnershipTransfer(sql.replace(cleanup,replacement)), false);
  }
  assert.equal(safeOwnershipTransfer(sql.replace(cleanup,'') + '\n' + cleanup), false);
});

test('ACL and schema ordering mutations cannot move privileges outside the transfer window', () => {
  for (const index of [0,1,2,3]) {
    const statement = transferStatements[index];
    assert.equal(safeOwnershipTransfer(sql.replaceAll(statement,'').replace(transferStatements[8], transferStatements[8] + '\n' + statement)), false);
  }
  for (const index of [5,9]) {
    const statement = transferStatements[index];
    assert.equal(safeOwnershipTransfer(sql.replace(statement,'')), false);
    assert.equal(safeOwnershipTransfer(sql.replace(statement,'').replace(transferStatements[0], statement + '\n' + transferStatements[0])), false);
  }
  assert.equal(safeOwnershipTransfer(sql + '\ngrant create on schema public to jersey_checkout_owner;'), false);
});

test('owner attribute mutations cannot add login, inheritance, bypass or administrative powers', () => {
  for (const role of ['jersey_checkout_owner','jersey_inventory_worker']) {
    const declaration = `create role ${role} nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;`;
    for (const attribute of ['nologin','nosuperuser','nocreatedb','nocreaterole','noinherit','nobypassrls']) {
      assert.equal(safeOwnershipTransfer(sql.replace(declaration, declaration.replace(attribute,attribute.slice(2)))), false);
    }
    assert.equal(safeOwnershipTransfer(sql + `\nalter role ${role} login;`), false);
    assert.equal(safeOwnershipTransfer(sql + `\nalter table public.orders owner to ${role};`), false);
  }
});

test('draft is a single transaction with next sequential filename and no live execution', () => {
  assert.match(raw, /DRAFT ONLY: NOT APPLIED/);
  assert.match(sql.trim(), /^begin;[^]*commit;$/);
  assert.equal((sql.match(/^commit;/gm) ?? []).length, 1);
  assert.doesNotMatch(sql, /\bdblink\b|\bhttp\w*\(|\bcron\.|\bcopy\b|\btruncate\b|\bdrop\s/);
});

test('exact eight foundation tables, each with RLS and customer revocation', () => {
  const expected = ['nigerian_states','checkout_settings','delivery_zones','delivery_zone_states','delivery_rates','product_variants','inventory_reservations','checkout_requests'];
  assert.deepEqual([...sql.matchAll(/create table public\.(\w+)/g)].map(m => m[1]), expected);
  for (const name of expected) assert.ok(sql.includes(`alter table public.${name} enable row level security;`));
  assert.match(sql, /revoke all on public.nigerian_states,[^;]*public.checkout_requests from public, anon, authenticated;/);
});

test('canonical reference set is exactly 36 states and FCT with no fictional business data', () => {
  const states = sql.match(/insert into public.nigerian_states[^;]+;/)[0];
  const ids = [...states.matchAll(/\('([a-z-]+)',/g)].map(m => m[1]);
  assert.deepEqual(ids, 'abia adamawa akwa-ibom anambra bauchi bayelsa benue borno cross-river delta ebonyi edo ekiti enugu gombe imo jigawa kaduna kano katsina kebbi kogi kwara lagos nasarawa niger ogun ondo osun oyo plateau rivers sokoto taraba yobe zamfara fct'.split(' '));
  assert.equal(ids.length, 37);
  assert.doesNotMatch(sql, /insert into public\.(delivery_zones|delivery_zone_states|delivery_rates|product_variants|products)\b/);
  assert.match(sql, /insert into public.checkout_settings values \(true,15\)/);
});

test('non-login owners are not table owners, superusers or RLS bypass roles', () => {
  for (const role of ['jersey_checkout_owner','jersey_inventory_worker']) {
    assert.ok(sql.includes(`create role ${role} nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;`));
    assert.ok(safeOwnershipTransfer(sql));
  }
  assert.doesNotMatch(sql, /alter table[^;]*owner to|\bdisable row level security/);
  assert.match(sql, /alter function public.create_checkout_order\(text\) owner to jersey_checkout_owner/);
  assert.match(sql, /revoke create on schema public from jersey_checkout_owner, jersey_inventory_worker/);
});

test('all functions fix search_path and revoke PUBLIC, anon and authenticated execution', () => {
  const names = [...sql.matchAll(/create function public\.(\w+)\(/g)].map(m => m[1]);
  assert.ok(names.length >= 7);
  for (const name of names) {
    assert.match(body(name), /set search_path = ''/);
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon, authenticated;`));
  }
  assert.doesNotMatch(sql, /\bexecute\s+(?:format\b|\w+\s*;|'|\$)|\braise\s+(?:log|notice|debug|warning)\b/);
});

test('only reference SELECT and authenticated checkout EXECUTE are added for customers', () => {
  assert.ok(safeCustomerGrants(sql));
  assert.equal(customerGrants(sql).length, 2);
  assert.equal(safeCustomerGrants(sql + '\ngrant insert on public.orders to authenticated;'), false);
  assert.equal(safeCustomerGrants(sql + '\ngrant execute on function public.create_checkout_order(text) to anon;'), false);
  assert.equal(safeCustomerGrants(sql + '\ngrant execute on function public.release_checkout_reservations(uuid,integer) to public;'), false);
  assert.equal(safeCustomerGrants(sql + '\ngrant update on public.orders to jersey_checkout_owner, authenticated;'), false);
});

test('checkout signature accepts no identity or financial parameter and verifies request context first', () => {
  assert.match(checkout, /^create function public.create_checkout_order\(p_request text\)/);
  assert.ok(checkout.indexOf("claims_text := pg_catalog.current_setting('request.jwt.claims', true)") < checkout.indexOf('req := p_request::pg_catalog.jsonb'));
  assert.match(checkout, /req - array\['idempotencykey','items','delivery'\] <> '\{\}'::pg_catalog.jsonb/);
  assert.doesNotMatch(checkout, /(?:req|item|delivery)\s*->>?\s*'(?:user_id|userid|price|subtotal|total|fee|discount|payment_status|payment_reference)'/);
});

test('raw request bytes and duplicate JSON keys checked without recursive traversal', () => {
  assert.match(checkout, /pg_catalog.octet_length\(p_request\) > 32768/);
  assert.doesNotMatch(checkout, /with recursive/);
  assert.match(checkout, /pg_catalog.json_each\(p_request::pg_catalog.json\)\s*group by key having pg_catalog.count\(\*\) > 1/);
  assert.match(checkout, /with objects\(value\)/);
  assert.ok(checkout.indexOf("jsonb_array_length(req -> 'items') not between 1 and 20") < checkout.indexOf('with objects(value)'));
  assert.match(checkout, /pg_catalog.json_each\(case when pg_catalog.json_typeof\(o.value\) = 'object' then o.value else '\{\}'::pg_catalog.json end\)\s*group by key having pg_catalog.count\(\*\) > 1/);
});

test('line shape, counts, quantities, sizes and duplicate pairs are bounded', () => {
  assert.match(checkout, /jsonb_array_length\(req -> 'items'\) not between 1 and 20/);
  assert.match(checkout, /units > 100/);
  assert.match(checkout, /item - array\['productid','selectedsize','quantity'\]/);
  assert.match(checkout, /jsonb_typeof\(item -> 'quantity'\) <> 'number'/);
  assert.ok(checkout.includes("!~ '^(10|[1-9])$'"));
  assert.match(checkout, /group by x ->> 'productid',x ->> 'selectedsize' having pg_catalog.count\(\*\) > 1/);
  assert.match(checkout, /not in \('xs','s','m','l','xl','2xl','3xl','4xl'\)/);
});

test('address branches reject extra fields and saved addresses require owner', () => {
  assert.match(checkout, /delivery - array\['kind','addressid','instructions'\]/);
  assert.match(checkout, /delivery - array\['kind','recipientname','phone','addressline1','addressline2','city','stateid','postalcode','instructions'\]/);
  assert.match(checkout, /from public.addresses where id = \(delivery ->> 'addressid'\)::pg_catalog.uuid and user_id = u/);
  assert.match(sql, /create policy checkout_addresses_read[^;]*user_id = \(select auth.uid\(\)\)/);
  assert.match(checkout, /select name into strict state_name from public.nigerian_states where id = state_value/);
});

test('bounded text and Nigerian phone normalization never confer financial authority', () => {
  assert.match(body('checkout_text'), /jsonb_typeof\(p_object -> p_key\) <> 'string'/);
  assert.match(body('checkout_text'), /length\(v\) > p_max/);
  assert.match(body('checkout_text'), /\[\[:cntrl:\]\]/);
  assert.ok(checkout.includes("'^(0|\\+234)[789][0-9]{9}$'"));
  assert.ok(checkout.includes("phone_value := '+234' || pg_catalog.substr(phone_value,2)"));
  assert.match(checkout, /checkout_text\(delivery,'instructions',500,false\)/);
});

test('idempotency has owner uniqueness, UUIDv4 key, SHA256 and concurrency lock', () => {
  assert.match(sql, /unique \(user_id,request_key\)/);
  assert.ok(sql.includes('-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-'));
  assert.match(sql, /octet_length\(fingerprint\) = 32/);
  assert.match(checkout, /pg_catalog.sha256\(pg_catalog.convert_to/);
  assert.match(checkout, /on conflict \(user_id,request_key\) do nothing/);
  assert.match(checkout, /where user_id = u and request_key = request_key_value for update/);
  assert.match(checkout, /claim.fingerprint <> digest_value or claim.canonicalization_version <> 1/);
  assert.ok(checkout.indexOf('if claim.order_id is not null') < checkout.indexOf('into strict saved'));
  const table = sql.match(/create table public.checkout_requests \([^]*?\n\);/)[0];
  assert.doesNotMatch(table, /jsonb?|request_body|payload/);
});

test('inventory constraints and row locks precede availability/price reads', () => {
  for (const rule of ['stock_quantity >= 0','reserved_quantity >= 0','reserved_quantity <= stock_quantity','unique (product_id,size)']) assert.ok(sql.includes(rule));
  assert.match(checkout, /order by p.id for share/);
  assert.match(checkout, /order by v.id for update of v/);
  assert.equal((checkout.match(/get diagnostics locked_count = row_count/g) ?? []).length, 2);
  assert.ok(checkout.indexOf('order by v.id for update') < checkout.indexOf('select * into strict variant'));
  assert.match(checkout, /stock_quantity - reserved_quantity >= quantity_value/);
});

test('prices, product flags, sizes and variants come only from locked database rows', () => {
  assert.match(checkout, /not product.is_active or not product.in_stock/);
  assert.match(checkout, /size_value = any\(product.sizes\)/);
  assert.match(checkout, /product.price_kobo not between 1 and 100000000/);
  assert.match(checkout, /not variant.is_active/);
  assert.match(checkout, /subtotal := subtotal \+ product.price_kobo \* quantity_value/);
  assert.match(checkout, /total := subtotal \+ rate.fee_kobo/);
  assert.match(checkout, /if total > 1000000000/);
});

test('rate coverage is unique, active periods exclude overlap, missing rate fails closed', () => {
  assert.match(sql, /state_id text primary key references public.nigerian_states/);
  assert.match(sql, /exclude using gist \(zone_id extensions.gist_uuid_ops with =,[^]*?with &&\) where \(is_active\)/);
  assert.match(sql, /fee_kobo bigint not null check \(fee_kobo between 0 and 100000000\)/);
  assert.match(checkout, /select \* into strict rate from public.delivery_rates/);
  assert.doesNotMatch(checkout, /coalesce\([^;]*fee_kobo/);
  assert.match(body('checkout_rate_guard'), /array\['is_active','effective_until'\]/);
});

test('historical rows remain nullable and existing exact financial constraints retained', () => {
  assert.match(sql, /add column checkout_version integer check \(checkout_version = 1\)/);
  assert.match(sql, /checkout_version is null or/);
  assert.match(sql, /add column variant_id uuid references/);
  assert.match(sql, /where variant_id is not null/);
  assert.doesNotMatch(sql, /update public.orders set checkout_version|update public.addresses|drop constraint/);
  assert.match(initial, /total_kobo::numeric = subtotal_kobo::numeric \+ delivery_fee_kobo::numeric/);
  assert.match(initial, /line_total_kobo::numeric = unit_price_kobo::numeric \* quantity::numeric/);
});

test('deferred consistency verifies cross-row totals and reservation correspondence', () => {
  const check = body('checkout_order_consistency');
  assert.match(check, /security definer/);
  assert.match(sql, /alter function public.checkout_order_consistency\(\) owner to jersey_inventory_worker/);
  assert.match(check, /subtotal is distinct from o.subtotal_kobo::pg_catalog.numeric/);
  assert.match(check, /i.quantity <> r.quantity/);
  assert.match(check, /r.expires_at <> o.reservation_expires_at/);
  assert.equal((sql.match(/deferrable initially deferred for each row/g) ?? []).length, 2);
});

test('new snapshots immutable; existing own-order/item policies remain intact', () => {
  assert.match(body('checkout_snapshot_guard'), /old.checkout_version = 1/);
  assert.match(body('checkout_snapshot_guard'), /new.user_id is not null/);
  assert.match(sql, /create trigger checkout_items_snapshot_guard before update/);
  assert.doesNotMatch(sql, /drop policy|alter policy/);
  assert.match(initial, /create policy orders_read_own[^;]*user_id = \(select auth.uid\(\)\)/);
  assert.match(initial, /create policy order_items_read_own[^;]*owning_order.user_id = \(select auth.uid\(\)\)/);
});

test('reservations inherit order ownership and terminal transitions cannot repeat', () => {
  const table = sql.match(/create table public.inventory_reservations \([^]*?\n\);/)[0];
  assert.doesNotMatch(table, /user_id/);
  assert.match(table, /unique \(order_id,variant_id\)/);
  assert.match(table, /expires_at timestamptz not null/);
  assert.match(body('checkout_reservation_guard'), /old.status <> 'active'/);
  assert.match(body('checkout_reservation_guard'), /new.status not in \('released','expired'\)/);
  assert.match(sql, /checkout_reservations_insert[^;]*o.user_id = \(select auth.uid\(\)\)/);
});

test('expiry batches are bounded and all variants globally locked before release', () => {
  assert.match(worker, /p_limit not between 1 and 100/);
  assert.match(worker, /order by id limit p_limit for update skip locked/);
  assert.ok(worker.indexOf('order by v.id for update') < worker.indexOf('for o in select'));
  assert.match(worker, /reserved_quantity = reserved_quantity - r.quantity/);
  assert.match(worker, /reserved_quantity >= r.quantity/);
  assert.match(worker, /where id = r.id and status = 'active'/);
});

test('paid/in-flight orders fail to review, not fulfillment or silent release', () => {
  assert.match(worker, /o.payment_status not in \('unpaid','failed'\)/);
  assert.match(worker, /set requires_review = true[^]*?continue/);
  assert.match(worker, /p_order_id is not null or not requires_review/);
  assert.doesNotMatch(sql, /set payment_status|payment_attempts|payment_events|paystack|set status = 'processing'/);
});

test('no raw SQL/auth/request disclosure or broad infrastructure modification', () => {
  assert.match(checkout, /exception when others then\s*raise exception 'checkout could not be completed'/);
  assert.doesNotMatch(sql, /sqlerrm|raise (?:log|notice)|service_role|sb_secret_|storage\.|auth\.users\s+set|insert into auth\./);
  assert.doesNotMatch(sql, /alter default privileges|grant all|to authenticator/);
  assert.doesNotMatch(sql, /https?:\/\//);
});

// Task 15D: stronger source mutation guards + synthetic tests of literal
// constraints. None execute PL/pgSQL or establish transaction/RLS correctness.
test('a delivery rate is rechecked after inventory waits and before order insertion', () => {
  const valid = source => {
    const locked = source.indexOf('order by v.id for update of v');
    const instant = source.lastIndexOf('rate_time := pg_catalog.clock_timestamp()');
    const check = source.indexOf('rate.effective_from > rate_time or (rate.effective_until is not null and rate.effective_until <= rate_time)', instant);
    const insert = source.indexOf('insert into public.orders(');
    return locked >= 0 && instant > locked && check > instant && insert > check;
  };
  assert.ok(valid(checkout));
  assert.equal(valid(checkout.replace('rate.effective_until <= rate_time', 'false')), false);
  assert.equal(valid(checkout.replaceAll('rate_time := pg_catalog.clock_timestamp()', 'rate_time := pg_catalog.now()')), false);
});

test('variant identity cannot be reassigned independently of historical snapshots', () => {
  const guard = body('checkout_variant_guard');
  for (const field of ['id','product_id','size']) assert.ok(guard.includes(`new.${field} is distinct from old.${field}`));
  assert.match(sql, /create trigger checkout_variant_guard before update on public.product_variants/);
  assert.match(sql, /revoke all on function public.checkout_variant_guard\(\) from public, anon, authenticated/);
});

test('both locking RPCs have a local lock timeout rather than unlimited default waits', () => {
  for (const routine of [checkout,worker]) assert.match(routine, /set lock_timeout = '5s'/);
  assert.doesNotMatch(sql, /set statement_timeout/); // Function SET is not a reliable whole-request timer.
});

test('deep malformed JSON no longer invokes a recursive SQL walk', () => {
  const depth = 2000;
  const malicious = '{"x":'.repeat(depth) + '0' + '}'.repeat(depth);
  assert.ok(Buffer.byteLength(malicious) < 32768);
  // Original recursive materialization would retain >10MB of nested JSON from
  // this ~12KB input, before root-key rejection. Not a PostgreSQL benchmark.
  const materializedCharacters = 3 * depth * (depth + 1) + depth;
  assert.ok(materializedCharacters > 10_000_000);
  assert.doesNotMatch(checkout, /with recursive/);
  assert.ok(checkout.indexOf("req - array['idempotencykey','items','delivery']") < checkout.indexOf('with objects(value)'));
});

test('literal UUIDv4 CHECK accepts only the approved canonical synthetic key form', () => {
  const pattern = raw.match(/request_key::text ~ '([^']+)'/)[1];
  const valid = new RegExp(pattern);
  assert.ok(valid.test('00000000-0000-4000-8000-000000000001'));
  for (const key of [
    '00000000-0000-1000-8000-000000000001',
    '00000000-0000-4000-7000-000000000001',
    'AAAAAAAA-0000-4000-8000-000000000001',
    '00000000000040008000000000000001', '', 'not-a-uuid',
  ]) assert.equal(valid.test(key), false);
});

test('literal quantity constraint rejects invalid numeric representations', () => {
  const pattern = raw.match(/item ->> 'quantity'\) !~ '([^']+)'/)[1];
  const valid = new RegExp(pattern);
  for (const q of ['1','2','9','10']) assert.ok(valid.test(q));
  for (const q of ['0','-1','1.5','11','100','NaN','Infinity','1.0','']) assert.equal(valid.test(q), false);
  assert.match(checkout, /jsonb_typeof\(item -> 'quantity'\) <> 'number'/);
  // PostgreSQL JSONB normalization of exponent spellings still needs execution.
});

test('exact raw-case request allowlists exclude every authoritative attack field', () => {
  const root = raw.match(/req - array\[([^\]]+)\]/)[1].split(',').map(s => s.trim().slice(1,-1));
  const line = raw.match(/item - array\[([^\]]+)\]/)[1].split(',').map(s => s.trim().slice(1,-1));
  assert.deepEqual(root, ['idempotencyKey','items','delivery']);
  assert.deepEqual(line, ['productId','selectedSize','quantity']);
  for (const field of ['userId','user_id','email','role','claims','orderId','owner','unitPrice','price','subtotal','total','deliveryFee','discount','paymentStatus','paymentReference','currency','country']) {
    assert.equal(root.includes(field), false);
    assert.equal(line.includes(field), false);
  }
});

// Task 15F.13: source contracts and extracted literal checks only. These do NOT
// execute PostgreSQL JSON parsing, SQL NULL logic, helper calls or RLS.
const identity = checkout.slice(checkout.indexOf('claims_text :='), checkout.indexOf('if p_request is null'));

test('modern claims are read exactly once before every checkout mutation without direct Auth calls', () => {
  assert.equal((checkout.match(/pg_catalog.current_setting\('request.jwt.claims', true\)/g) ?? []).length, 1);
  assert.doesNotMatch(checkout, /auth\.(?:uid|role|jwt)\s*\(/);
  assert.match(checkout, /security definer set search_path = '' set lock_timeout = '5s'/);
  const firstWrite = checkout.search(/\b(?:insert into|update public\.)/);
  assert.ok(firstWrite > checkout.indexOf('if p_request is null'));
  assert.match(identity, /claims_text := pg_catalog.current_setting\('request.jwt.claims', true\);/);
  assert.doesNotMatch(identity, /p_request|req\s*->|set_config|lower\(|btrim\(|trim\(/);
});

test('missing, empty and whitespace claims have an explicit rejecting guard before JSON parsing', () => {
  assert.match(identity, /if claims_text is null or claims_text ~ '\^\[\[:space:\]\]\*\$' then raise exception 'authentication required'; end if;/);
  assert.ok(identity.indexOf('claims_text is null') < identity.indexOf('claims := claims_text::pg_catalog.jsonb'));
});

test('malformed JSON reaches the generic handler; JSON null, arrays and scalars are rejected', () => {
  assert.match(identity, /claims := claims_text::pg_catalog.jsonb;\s*if pg_catalog.jsonb_typeof\(claims\) is distinct from 'object' then raise exception 'authentication required'; end if;/);
  assert.match(checkout, /exception when others then\s*raise exception 'checkout could not be completed' using errcode = 'p0001'/);
  assert.doesNotMatch(identity, /exception when|coalesce\(claims/);
});

test('missing/non-string roles and anonymous or other roles fail NULL-safely', () => {
  assert.match(identity, /if pg_catalog.jsonb_typeof\(claims -> 'role'\) is distinct from 'string'\s*or \(claims ->> 'role'\) is distinct from 'authenticated' then raise exception 'authentication required'; end if;/);
});

test('missing/null/non-string subjects fail; canonical UUID regex precedes the only subject cast', () => {
  assert.match(identity, /if pg_catalog.jsonb_typeof\(claims -> 'sub'\) is distinct from 'string'\s*or \(\(claims ->> 'sub'\) ~ '[^']+'\) is not true then\s*raise exception 'authentication required';\s*end if;\s*u := \(claims ->> 'sub'\)::pg_catalog.uuid;/);
  assert.equal((identity.match(/::pg_catalog.uuid/g) ?? []).length, 1);
  const pattern = raw.match(/\(claims ->> 'sub'\) ~ '([^']+)'/)[1];
  const accepts = new RegExp(pattern);
  for (const value of ['00000000-0000-1000-8000-000000000001','AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA']) {
    assert.equal(accepts.test(value), true); // Synthetic, not restricted to v4/lowercase.
  }
  for (const value of ['', 'invalid', '00000000000010008000000000000001', '{00000000-0000-1000-8000-000000000001}', ' 00000000-0000-1000-8000-000000000001']) {
    assert.equal(accepts.test(value), false);
  }
});

test('missing/null/non-string email and invalid length/control characters retain rejecting guards', () => {
  assert.match(identity, /if pg_catalog.jsonb_typeof\(claims -> 'email'\) is distinct from 'string' then raise exception 'authentication required'; end if;\s*email_claim := claims ->> 'email';/);
  assert.match(identity, /if email_claim is null or pg_catalog.length\(email_claim\) not between 3 and 254 or email_claim ~ '\[\[:cntrl:\]\]' then\s*raise exception 'authentication required';/);
  assert.equal((checkout.match(/email_claim :=/g) ?? []).length, 1);
  assert.doesNotMatch(identity, /(?:btrim|lower|upper)\(/);
});

test('all four nonempty legacy override settings reject before subject extraction, never fall back', () => {
  for (const key of ['request.jwt.claim','request.jwt.claim.sub','request.jwt.claim.role','request.jwt.claim.email']) {
    const check = `nullif(pg_catalog.current_setting('${key}', true), '') is not null`;
    assert.equal(identity.split(check).length - 1, 1);
    assert.ok(identity.indexOf(check) < identity.indexOf('u :='));
  }
  assert.match(identity, /request.jwt.claim.email', true\), ''\) is not null then\s*raise exception 'authentication required';/);
  assert.doesNotMatch(identity, /coalesce|set_config/);
});

test('retained UID policies and helper EXECUTE remain documented runtime gates without auth schema grant', () => {
  assert.match(sql, /grant usage on schema public to jersey_checkout_owner;/);
  assert.doesNotMatch(sql, /grant usage on schema[^;]*\bauth\b/);
  assert.match(sql, /grant execute on function auth.uid\(\), auth.role\(\), auth.jwt\(\) to jersey_checkout_owner;/);
  const policies = [...sql.matchAll(/create policy ([^;]+);/g)].filter(m => m[1].includes('to jersey_checkout_owner') && m[1].includes('auth.uid()'));
  assert.equal(policies.length, 10);
  const docs = readFileSync(new URL('../docs/checkout-foundation-draft.md', import.meta.url), 'utf8');
  assert.match(docs, /retained RLS policies remain a separate runtime-verification gate/);
  assert.ok(safeCustomerGrants(sql));
  assert.ok(safeOwnershipTransfer(sql));
});

test('all three definer functions have exact final ownership and explicit entrypoint grants', () => {
  const owners = new Map([
    ['create_checkout_order','jersey_checkout_owner'],
    ['release_checkout_reservations','jersey_inventory_worker'],
    ['checkout_order_consistency','jersey_inventory_worker'],
  ]);
  const names = [...sql.matchAll(/create function public\.(\w+)\(/g)].map(m => m[1]);
  const definers = names.filter(n => /security definer/.test(body(n)));
  assert.deepEqual(definers.sort(), [...owners.keys()].sort());
  for (const [name,owner] of owners) assert.match(sql, new RegExp(`alter function public\\.${name}\\([^)]*\\) owner to ${owner};`));
  assert.ok(safeCustomerGrants(sql));
  assert.doesNotMatch(body('checkout_order_consistency'), /auth.uid|auth.jwt|p_request/);
});

test('stock counter arithmetic is guarded and all new money fits bigint intermediates', () => {
  const maxUnit = 100000000n, maxUnits = 100n, maxFee = 100000000n;
  assert.ok(maxUnit * maxUnits + maxFee < (2n ** 63n - 1n));
  assert.match(checkout, /reserved_quantity = reserved_quantity \+ quantity_value\s*where id = product_id_value and stock_quantity - reserved_quantity >= quantity_value/);
  assert.match(worker, /reserved_quantity = reserved_quantity - r.quantity\s*where id = r.variant_id and reserved_quantity >= r.quantity/);
  assert.match(checkout, /if total > 1000000000 then raise exception/);
});

test('delivery interval literals enforce half-open boundaries and require a configured rate', () => {
  assert.match(sql, /tstzrange\(effective_from,effective_until,'\[\)'\)/);
  assert.match(checkout, /effective_from <= rate_time and \(effective_until is null or effective_until > rate_time\)/);
  const inPeriod = (start,end,now) => start <= now && (end === null || end > now);
  assert.equal(inPeriod(10,20,10), true);
  assert.equal(inPeriod(10,20,20), false);
  assert.equal(inPeriod(20,30,20), true);
  assert.equal(inPeriod(10,null,100), true);
  assert.equal(inPeriod(20,null,10), false);
  // This is a boundary-model test, not proof of PostgreSQL EXCLUDE concurrency.
});

test('runtime types cannot resolve through an implicit temporary schema', () => {
  const safeTypes = routine => {
    const runtime = routine.split('as $$')[1];
    const declarations = runtime.match(/\bdeclare\b([^]*?)\bbegin\b/)?.[1] ?? '';
    return !/(?<![.\w])(?:uuid|text|jsonb?|timestamptz|bytea|integer|bigint|numeric|boolean|int4|int8|bool)\b/.test(declarations)
      && !/::(?!pg_catalog\.)\w+/.test(runtime);
  };
  for (const [,name] of sql.matchAll(/create function public\.(\w+)\(/g)) assert.ok(safeTypes(body(name)), name);
  assert.equal(safeTypes(checkout.replaceAll('pg_catalog.uuid','uuid')), false);
  assert.equal(safeTypes(checkout.replaceAll('::pg_catalog.jsonb','::jsonb')), false);
  assert.match(checkout, /set search_path = ''/);
});
