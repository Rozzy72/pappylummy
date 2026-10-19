import { loadUi } from './ui-loader.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { Module, createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require('react-dom/server');
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
function load(file, mocks) {
  const m = new Module(file);
  m.require = name => name === '@sd/ui' ? loadUi() : Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  m._compile(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, file);
  return m.exports;
}
function harness({ user = { id: 'synthetic-user-a', metadata: 'private-metadata' }, authError = null, authThrows = false, profile = { full_name: 'Synthetic Fan', phone: null }, queryError = null, queryThrows = false } = {}) {
  const calls = [];
  const client = {
    auth: { getUser: async () => { calls.push('verified'); if (authThrows) throw Error('private-auth-error'); return { data: { user }, error: authError }; } },
    from: table => {
      calls.push(['from', table]); assert.equal(calls[0], 'verified');
      return { select: columns => {
        calls.push(['select', columns]);
        return { eq: (key, value) => {
          calls.push(['eq', key, value]);
          return { maybeSingle: async () => { if (queryThrows) throw Error('private-database-error'); return { data: profile, error: queryError }; } };
        } };
      } };
    },
  };
  const helper = load('src/lib/auth/require-user.ts', {
    'server-only': {}, '@/lib/supabase/server': { createClient: async () => client },
    'next/navigation': { redirect: destination => { throw Object.assign(Error('redirect'), { destination }); } },
  });
  const page = load('src/app/account/page.tsx', { '@/lib/auth/require-user': helper });
  return { calls, page, helper, render: async props => renderToStaticMarkup(await page.default(props)) };
}
test('anonymous request redirects to fixed login with zero private reads', async () => {
  const h = harness({ user: null });
  await assert.rejects(h.render(), e => e.destination === '/login');
  assert.deepEqual(h.calls, ['verified']);
});
test('verified identity alone selects minimal own profile after authentication', async () => {
  const h = harness(); const html = await h.render();
  assert.match(html, /Synthetic Fan/); assert.match(html, /Not provided/);
  assert.deepEqual(h.calls, ['verified', ['from','profiles'], ['select','full_name, phone'], ['eq','id','synthetic-user-a']]);
});
test('query and browser IDs cannot select another profile or redirect', async () => {
  const h = harness(); await h.render({ userId: 'synthetic-user-b', profileId: 'synthetic-user-b', searchParams: Promise.resolve({ user: 'synthetic-user-b', next: 'https://untrusted.example' }) });
  assert.deepEqual(h.calls.at(-1), ['eq','id','synthetic-user-a']);
});
test('auth errors and exceptions fail closed before any private query', async () => {
  for (const options of [{ authError: { message: 'private-auth-error' } }, { authThrows: true }]) {
    const h = harness(options); await assert.rejects(h.render(), e => e.destination === '/login' && !e.message.includes('private-auth-error'));
    assert.deepEqual(h.calls, ['verified']);
  }
});
test('missing profile shows safe state with no fallback lookup', async () => {
  const h = harness({ profile: null }); assert.match(await h.render(), /currently unavailable/);
  assert.equal(h.calls.filter(c => Array.isArray(c) && c[0] === 'from').length, 1);
});
test('query error and thrown failure never expose database internals', async () => {
  for (const options of [{ queryError: { message: 'private-database-error' } }, { queryThrows: true }]) {
    const html = await harness(options).render(); assert.match(html, /currently unavailable/); assert.doesNotMatch(html, /private-database-error|Synthetic Fan/);
  }
});
test('null fields use safe empty states', async () => {
  const html = await harness({ profile: { full_name: null, phone: null } }).render();
  assert.equal((html.match(/Not provided/g) || []).length, 2);
});
test('only name and phone render; extra identity/session fields never serialize', async () => {
  const html = await harness({ profile: { full_name: 'Synthetic Fan', phone: 'Synthetic phone', id: 'synthetic-user-a', session: 'synthetic-session', access_token: 'synthetic-token', metadata: 'private-metadata' } }).render();
  assert.match(html, /Synthetic phone/); assert.doesNotMatch(html, /synthetic-user-a|synthetic-session|synthetic-token|private-metadata/);
});
test('profile text is escaped rather than interpreted as HTML', async () => {
  const html = await harness({ profile: { full_name: '<script>bad()</script>', phone: null } }).render();
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;/);
});
test('server-only independent boundary never trusts stores, cookies or proxy claims', () => {
  const source = read('src/lib/auth/require-user.ts');
  assert.match(source, /import "server-only"/); assert.match(source, /client.auth.getUser\(\)/);
  assert.doesNotMatch(source + read('src/app/account/page.tsx'), /getSession|getClaims|localStorage|zustand|searchParams|cookies\(|console\.|service_role|sb_secret_|dangerouslySetInnerHTML/);
});
test('account explicitly disables shared rendering and data caching', () => {
  assert.equal(harness().page.dynamic, 'force-dynamic');
  assert.doesNotMatch(read('src/app/account/page.tsx'), /force-cache|use cache|unstable_cache|generateStaticParams/);
  assert.match(read('src/lib/supabase/proxy.ts'), /private, no-cache, no-store/);
});
test('repository RLS ties profile reads to auth.uid and denies anon grants', () => {
  const sql = read('supabase/migrations/001_initial_schema.sql');
  assert.match(sql, /id uuid primary key references auth.users\(id\) on delete cascade/);
  assert.match(sql, /alter table public.profiles enable row level security/);
  assert.match(sql, /create policy profiles_read_own on public.profiles\s+for select to authenticated\s+using \(id = \(select auth.uid\(\)\)\)/);
  assert.match(sql, /revoke all on table public.products, public.profiles,[\s\S]*?from public, anon, authenticated;/);
  assert.doesNotMatch(sql, /grant select on table public.profiles[^;]*to anon/);
});
