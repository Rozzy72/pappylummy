import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8').replace(/--[^\n]*/g, '').toLowerCase();
const sql = read('supabase/migrations/002_profile_lifecycle.sql');
const initial = read('supabase/migrations/001_initial_schema.sql');
test('profile schema permits minimal identity insert', () => {
  assert.match(initial, /id uuid primary key references auth.users\(id\) on delete cascade,\s+full_name text,\s+phone text,\s+created_at timestamptz not null default now\(\),\s+updated_at timestamptz not null default now\(\)/);
});
test('definer function has empty search path and identity-only insert', () => {
  assert.match(sql, /returns trigger\s+language plpgsql\s+security definer\s+set search_path = ''/);
  assert.match(sql, /insert into public.profiles \(id\) values \(new.id\);\s+return new;/);
  assert.doesNotMatch(sql, /raw_user_meta_data|raw_app_meta_data|email|provider|exception|on conflict/);
});
test('transaction replaces exactly one named after-insert row trigger', () => {
  assert.match(sql.trim(), /^begin;[\s\S]*commit;$/);
  assert.equal((sql.match(/create trigger /g) || []).length, 1);
  assert.match(sql, /drop trigger if exists jersey_store_auth_user_created on auth.users;/);
  assert.match(sql, /create trigger jersey_store_auth_user_created\s+after insert on auth.users\s+for each row execute function public.jersey_store_create_profile\(\);/);
});
test('client execution revoked and no table grants or RLS changes introduced', () => {
  assert.match(sql, /revoke all on function public.jersey_store_create_profile\(\)\s+from public, anon, authenticated;/);
  assert.doesNotMatch(sql, /\bgrant\b|\bpolicy\b|alter table|disable|insert into auth|update public|delete from/);
});
test('existing own-row SELECT and restricted UPDATE retained', () => {
  assert.match(initial, /grant update \(full_name, phone\) on public.profiles to authenticated/);
  assert.match(initial, /create policy profiles_read_own on public.profiles\s+for select to authenticated\s+using \(id = \(select auth.uid\(\)\)\)/);
  assert.match(initial, /create policy profiles_update_own on public.profiles\s+for update to authenticated\s+using \(id = \(select auth.uid\(\)\)\)\s+with check \(id = \(select auth.uid\(\)\)\)/);
  assert.doesNotMatch(initial, /grant (?:insert|delete)[^;]*on public.profiles/);
});
test('no existing-user backfill or metadata-dependent data statements', () => {
  assert.equal((sql.match(/insert into /g) || []).length, 1);
  assert.doesNotMatch(sql, /select .*auth.users|new\.(?!id\b)[a-z_]+/);
});
