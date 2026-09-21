import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require('next/server');
const { unstable_doesMiddlewareMatch } = require('next/experimental/testing/server');
function load(file, mocks) {
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const mod = new Module(file);
  mod.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return mod.exports;
}
function harness(behavior = async () => ({ data: null, error: null })) {
  const calls = [];
  const helper = load('src/lib/supabase/proxy.ts', {
    'server-only': {},
    '@/lib/supabase/config': { getSupabasePublicConfig: () => ({ url: 'https://test.supabase.co', publishableKey: 'sb_publishable_test' }) },
    '@supabase/ssr': { createServerClient: (url, key, options) => {
      calls.push({ url, key, options });
      return { auth: { getClaims: () => behavior(options.cookies) } };
    } },
  });
  return { ...helper, calls };
}
const request = (cookie) => new NextRequest('https://store.example/shop', { headers: cookie ? { cookie } : {} });
const cache = { 'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0', Expires: '0', Pragma: 'no-cache' };
test('anonymous request passes without redirect or unnecessary cookie writes', async () => {
  const h = harness(); const res = await h.updateSession(request());
  assert.equal(res.status, 200); assert.equal(res.headers.get('location'), null);
  assert.equal(res.cookies.getAll().length, 0); assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].options.cookies.getAll(), []);
});
test('fresh client and public configuration per request', async () => {
  const h = harness(); await h.updateSession(request()); await h.updateSession(request());
  assert.equal(h.calls.length, 2); assert.notEqual(h.calls[0].options, h.calls[1].options);
  assert.equal(h.calls[0].key, 'sb_publishable_test');
});
test('refresh forwards request cookies and multiple outgoing cookies with options', async () => {
  const options = { path: '/', sameSite: 'lax', secure: true, httpOnly: false, maxAge: 3600 };
  const h = harness(async (cookies) => {
    cookies.setAll([{ name: 'session.0', value: 'new-a', options }, { name: 'session.1', value: 'new-b', options }], cache);
    assert.equal(cookies.getAll().find(c => c.name === 'session.0').value, 'new-a');
  });
  const res = await h.updateSession(request('session.0=old'));
  for (const name of ['session.0', 'session.1']) {
    const cookie = res.cookies.get(name);
    for (const [key, value] of Object.entries(options)) assert.equal(cookie[key], value);
  }
  assert.match(res.headers.get('x-middleware-request-cookie'), /session.0=new-a/);
  assert.match(res.headers.get('x-middleware-request-cookie'), /session.1=new-b/);
  assert.equal(res.headers.getSetCookie().length, 2);
});
test('multiple response reconstructions retain previous cookies and first-write cache headers', async () => {
  const h = harness(async c => {
    c.setAll([{ name: 'first', value: 'a', options: { path: '/', secure: true } }], cache);
    c.setAll([{ name: 'second', value: 'b', options: { path: '/' } }], {});
  });
  const res = await h.updateSession(request());
  assert.equal(res.cookies.get('first').value, 'a'); assert.equal(res.cookies.get('first').secure, true);
  assert.equal(res.cookies.get('second').value, 'b');
  for (const [key,value] of Object.entries(cache)) assert.equal(res.headers.get(key), value);
  assert.equal(res.headers.get('location'), null); // No redirect branch exists in this refresh-only helper.
});
test('session-bearing response without refresh is not publicly cacheable', async () => {
  const res = await harness().updateSession(request('session=existing'));
  assert.match(res.headers.get('cache-control'), /private.*no-store/);
});
test('invalid session result preserves SDK cookie removal and passes public browsing', async () => {
  const h = harness(async c => {
    c.setAll([{ name: 'session', value: '', options: { path: '/', maxAge: 0 } }], cache);
    return { data: null, error: { message: 'invalid session' } };
  });
  const res = await h.updateSession(request('session=invalid'));
  assert.equal(res.status, 200); assert.equal(res.cookies.get('session').maxAge, 0);
});
test('thrown refresh failure keeps writes and returns a non-cacheable public response', async () => {
  const h = harness(async c => {
    c.setAll([{ name: 'session', value: '', options: { maxAge: 0, path: '/' } }], cache);
    throw new Error('sensitive diagnostics must not escape');
  });
  const res = await h.updateSession(request('session=expired'));
  assert.equal(res.status, 200); assert.equal(res.cookies.get('session').maxAge, 0);
  assert.match(res.headers.get('cache-control'), /no-store/);
});
const entry = load('src/proxy.ts', { '@/lib/supabase/proxy': { updateSession: () => NextResponse.next() } });
test('matcher excludes static assets', () => {
  for (const url of ['/_next/static/a.js','/_next/image?url=x','/favicon.ico','/products/placeholder.svg','/a.webp','/a.woff2'])
    assert.equal(unstable_doesMiddlewareMatch({ config: entry.config, nextConfig: {}, url }), false, url);
});
test('matcher includes auth, account and all public catalogue/selection routes', () => {
  for (const url of ['/','/login','/account','/account/orders','/auth/confirm','/forgot-password','/reset-password','/shop','/product/arsenal-home','/cart','/wishlist'])
    assert.equal(unstable_doesMiddlewareMatch({ config: entry.config, nextConfig: {}, url }), true, url);
});
test('real config rejects privileged credentials; proxy has no logging or redirects', () => {
  const config = load('src/lib/supabase/config.ts', {});
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    for (const key of ['sb_secret_test', 'service_role', 'invalid']) {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
      assert.throws(() => config.getSupabasePublicConfig());
    }
  } finally {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
  const source = readFileSync(new URL('../src/lib/supabase/proxy.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /console\.|redirect\(|getSession\(|service_role|sb_secret_/);
  assert.match(source, /auth\.getClaims\(\)/);
});
