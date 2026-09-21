import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { Module, createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const m = new Module(file);
  m.require = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  m._compile(ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return m.exports;
}
const validation = load('src/lib/auth/validation.ts');
const idle = { status: 'idle', message: '' };
function form(email = ' Person@Example.com ', password = 'test-passphrase-123') {
  const f = new FormData(); f.set('email', email); f.set('password', password); return f;
}
function actions(result = { data: { session: null }, error: null }, throws = false) {
  const calls = [];
  const record = method => async input => { calls.push({ method, input }); if (throws) throw Error('private diagnostic'); return result; };
  return { calls, ...load('src/app/login/actions.ts', {
    '@/lib/auth/validation': validation,
    '@/lib/supabase/server': { createClient: async options => {
      assert.equal(options.writableCookies, true);
      return { auth: { signUp: record('signUp'), signInWithPassword: record('signInWithPassword') } };
    } },
    'next/navigation': { redirect: destination => { throw Object.assign(Error('redirect'), { destination }); } },
  }) };
}
test('valid signup normalizes email, keeps password, and sends only credentials', async () => {
  const a = actions(); const f = form(); f.set('userId', 'spoof'); f.set('profileId', 'spoof'); f.set('role', 'admin');
  const state = await a.signUp(idle, f);
  assert.equal(state.status, 'success'); assert.deepEqual(a.calls, [{ method: 'signUp', input: { email: 'person@example.com', password: 'test-passphrase-123' } }]);
  assert.doesNotMatch(JSON.stringify(state), /test-passphrase|person@example/);
});
test('invalid email rejected before Auth', async () => {
  for (const email of ['', 'bad', 'a@@b.com', 'a b@c.com']) { const a = actions(); assert.equal((await a.signUp(idle, form(email))).status, 'error'); assert.equal(a.calls.length, 0); }
});
test('missing, short signup and oversized passwords rejected before Auth', async () => {
  for (const password of ['', 'short', 'x'.repeat(129)]) { const a = actions(); assert.equal((await a.signUp(idle, form('a@b.com', password))).status, 'error'); assert.equal(a.calls.length, 0); }
  const a = actions(); const f = form(); f.delete('password'); assert.equal((await a.signIn(idle, f)).status, 'error'); assert.equal(a.calls.length, 0);
});
test('oversized email, duplicate credentials and File inputs rejected', async () => {
  const cases = [form('x'.repeat(255)+'@b.com')];
  const duplicate = form(); duplicate.append('email', 'b@c.com'); cases.push(duplicate);
  const file = form(); file.set('password', new Blob(['password'])); cases.push(file);
  for (const f of cases) { const a = actions(); assert.equal((await a.signUp(idle, f)).status, 'error'); assert.equal(a.calls.length, 0); }
});
test('signup session redirects to fixed account; confirmation-required does not', async () => {
  const a = actions({ data: { session: {} }, error: null }); const f = form(); f.set('next', 'https://evil.example');
  await assert.rejects(a.signUp(idle, f), e => e.destination === '/account');
  assert.equal((await actions().signUp(idle, form())).status, 'success');
});
test('duplicate signup uses same neutral message as confirmation-required', async () => {
  for (const code of ['user_already_exists','email_exists']) assert.deepEqual(await actions({ data: {}, error: { code, message: 'private' } }).signUp(idle, form()), await actions().signUp(idle, form()));
});
test('signup errors and exceptions never expose Auth internals', async () => {
  for (const a of [actions({ data: {}, error: { code: 'unexpected', message: 'private diagnostic' } }), actions(undefined, true)]) {
    const state = await a.signUp(idle, form()); assert.equal(state.status, 'error'); assert.doesNotMatch(state.message, /private diagnostic/);
  }
});
test('signin uses password API and ignores every supplied redirect target', async () => {
  for (const target of ['https://evil.example','//evil.example','%2f%2fevil.example','javascript:alert(1)','data:text/plain,x']) {
    const a = actions({ data: { session: {} }, error: null }); const f = form(); for (const key of ['next','redirect','returnTo','callback']) f.set(key,target);
    await assert.rejects(a.signIn(idle, f), e => e.destination === '/account'); assert.equal(a.calls[0].method,'signInWithPassword'); assert.deepEqual(Object.keys(a.calls[0].input),['email','password']);
  }
});
test('nonexistent user, wrong password, absent session and network failures have identical signin response', async () => {
  const expected = await actions().signIn(idle, form());
  for (const message of ['user missing','wrong password','email not confirmed']) assert.deepEqual(await actions({ data: {}, error: { message } }).signIn(idle, form()), expected);
  assert.deepEqual(await actions(undefined,true).signIn(idle,form()),expected);
  assert.deepEqual(await actions().signIn(idle,form('invalid')),expected);
});
function confirm(result = { data: { session: {} }, error: null }, throws = false) {
  const calls=[];
  return { calls, ...load('src/app/auth/confirm/route.ts', {
    '@/lib/auth/validation':validation,
    '@/lib/supabase/server':{createClient:async options=>{assert(options.writableCookies);options.responseHeaders.set('Pragma','no-cache');return {auth:{verifyOtp:async input=>{calls.push(input);if(throws)throw Error('private diagnostic');return result;}}};}},
  }) };
}
const token='a'.repeat(56);
test('confirmation accepts only email type and correctly shaped single hash',async()=>{
  for(const query of ['', 'type=email', `token_hash=${token}`, ...[55,57,64].map(length => `type=email&token_hash=${'a'.repeat(length)}`), `type=email&token_hash=${'A'.repeat(56)}`, `type=email&token_hash=${'g'.repeat(56)}`,`type=recovery&token_hash=${token}`,`type=signup&token_hash=${token}`,`type=email&token_hash=bad`,`type=email&token_hash=${token}&token_hash=${token}`,`type=email&type=email&token_hash=${token}`]){
    const c=confirm();const res=await c.GET(new Request('https://store.example/auth/confirm?'+query));assert.equal(res.headers.get('location'),'/login?confirmation=failed');assert.equal(c.calls.length,0);assert.equal(await res.text(),'');assert.doesNotMatch([...res.headers].join(''),new RegExp(token));
  }
});
test('confirmation uses SDK and fixed relative destination, preserving safe cache headers',async()=>{
  const c=confirm();const res=await c.GET(new Request(`https://untrusted-host.example/auth/confirm?type=email&token_hash=${token}&next=https://evil.example`));
  assert.deepEqual(c.calls,[{token_hash:token,type:'email'}]);assert.equal(res.status,303);assert.equal(res.headers.get('location'),'/account');assert.equal(res.headers.get('referrer-policy'),'no-referrer');assert.match(res.headers.get('cache-control'),/no-store/);assert.equal(res.headers.get('pragma'),'no-cache');assert.doesNotMatch([...res.headers].join(''),new RegExp(token));
});
test('confirmation failures and exceptions return only fixed safe failure state',async()=>{
  for(const c of [confirm({data:{},error:{message:'private diagnostic'}}),confirm(undefined,true),confirm({data:{session:null},error:null})]){
    const res=await c.GET(new Request(`https://store.example/auth/confirm?type=email&token_hash=${token}`));assert.equal(res.headers.get('location'),'/login?confirmation=failed');assert.equal(await res.text(),'');
  }
});
test('PKCE token reaches verifyOtp unchanged with email type and fixed success redirect',async()=>{
  const value='pkce_'+token;
  const c=confirm();const res=await c.GET(new Request('https://store.example/auth/confirm?'+new URLSearchParams({type:'email',token_hash:value,next:'https://evil.example'})));
  assert.deepEqual(c.calls,[{token_hash:value,type:'email'}]);
  assert.equal(res.headers.get('location'),'/account');
  assert.equal(await res.text(),'');assert(![...res.headers].join('').includes(value));
});
test('invalid PKCE lengths, characters and prefixes are rejected before verification',async()=>{
  const values=['pkce_'+'a'.repeat(55),'pkce_'+'a'.repeat(57),'pkce_'+'A'.repeat(56),'pkce_'+'g'.repeat(56),'pkce-'+token,'PKCE_'+token,'other_'+token,'pkce_','pkce_pkce_'+token];
  for(const value of values){
    const c=confirm();const res=await c.GET(new Request('https://store.example/auth/confirm?'+new URLSearchParams({type:'email',token_hash:value})));
    assert.equal(c.calls.length,0);assert.equal(res.headers.get('location'),'/login?confirmation=failed');assert.equal(await res.text(),'');assert(![...res.headers].join('').includes(value));
  }
});
test('PKCE verification failure does not disclose token in errors or redirect',async()=>{
  const value='pkce_'+token;
  const c=confirm({data:{},error:{message:value}});
  const res=await c.GET(new Request('https://store.example/auth/confirm?'+new URLSearchParams({type:'email',token_hash:value})));
  assert.deepEqual(c.calls,[{token_hash:value,type:'email'}]);assert.equal(res.headers.get('location'),'/login?confirmation=failed');assert.equal(await res.text(),'');assert(![...res.headers].join('').includes(value));
});
test('real server adapter preserves writable cookie options and SSR response headers, RSC remains read-only',async()=>{
  let adapter; const writes=[];
  const server=load('src/lib/supabase/server.ts',{'server-only':{},'next/headers':{cookies:async()=>({getAll:()=>[],set:(...args)=>writes.push(args)})},'@/lib/supabase/config':{getSupabasePublicConfig:()=>({url:'https://test.supabase.co',publishableKey:'sb_publishable_test'})},'@supabase/ssr':{createServerClient:(_u,_k,o)=>{adapter=o.cookies;return {};}}});
  const headers=new Headers();await server.createClient({writableCookies:true,responseHeaders:headers});const options={secure:true,sameSite:'lax',path:'/'};adapter.setAll([{name:'session',value:'test',options}],{'Cache-Control':'private, no-store'});assert.deepEqual(writes,[['session','test',options]]);assert.equal(headers.get('cache-control'),'private, no-store');await server.createClient();adapter.setAll([{name:'session',value:'ignored',options}],{});assert.equal(writes.length,1);
});
test('auth source never writes profiles, logs credentials, touches stores or accepts redirect inputs',()=>{
  for(const file of ['src/app/login/actions.ts','src/app/auth/confirm/route.ts']){
    const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.doesNotMatch(source,/console\.|\.from\(|localStorage|cart-store|wishlist-store|service_role|sb_secret_|dangerouslySetInnerHTML/);
  }
});
test('UI has semantic labels, autocomplete, pending feedback and password clearing without value echo',()=>{
  const source=readFileSync(new URL('../src/components/auth/auth-form.tsx',import.meta.url),'utf8');
  for(const value of ['htmlFor=','autoComplete="email"','"new-password"','"current-password"','disabled={pending}','aria-live="polite"','passwordRef.current.value = ""']) assert(source.includes(value));
  assert.doesNotMatch(source,/defaultValue=|value=\{.*password|dangerouslySetInnerHTML/);
});
