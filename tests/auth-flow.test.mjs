import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { Module, createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  mocks={'@/lib/auth/initialize-registration-profile':{initializeRegistrationProfile:async()=>{}},...mocks};
  const m = new Module(file);
  m.require = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  m._compile(ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return m.exports;
}
const validation = load('src/lib/auth/validation.ts', {'@/lib/delivery':load('src/lib/delivery.ts',{})});
const idle = { status: 'idle', message: '' };
function form(email = ' Person@Example.com ', password = 'test-passphrase-123') {
  const f = new FormData(); f.set('email', email); f.set('password', password); f.set('confirm_password', password); f.set('full_name','Sample Fan'); f.set('phone','+2348000000000'); f.set('address','Sample Street, Osogbo, Osun'); f.set('city','Osogbo'); f.set('state','Osun'); return f;
}
function actions(result = { data: { session: null }, error: null }, throws = false) {
  const calls = [];
  const record = method => async input => { calls.push({ method, input }); if (throws) throw Error('private diagnostic'); return result; };
  return { calls, ...load('src/app/login/actions.ts', {
    '@/lib/auth/validation': validation,
    '@/lib/auth/registration-config':{confirmationRedirectUrl:()=> 'https://configured.example/auth/confirm'},
    '@/lib/supabase/server': { createClient: async options => {
      assert.equal(options.writableCookies, true);
      return { auth: { signUp: record('signUp'), signInWithPassword: record('signInWithPassword') } };
    } },
    'next/navigation': { redirect: destination => { throw Object.assign(Error('redirect'), { destination }); } },
  }) };
}
test('valid signup normalizes email, keeps password, and sends validated contact details without privilege fields', async () => {
  const a = actions(); const f = form(); f.set('userId', 'spoof'); f.set('profileId', 'spoof'); f.set('role', 'admin');
  const state = await a.signUp(idle, f);
  assert.equal(state.status, 'success'); assert.deepEqual(a.calls, [{ method: 'signUp', input: { email: 'person@example.com', password: 'test-passphrase-123',options:{emailRedirectTo:'https://configured.example/auth/confirm',data:{full_name:'Sample Fan',phone:'+2348000000000',address:'Sample Street, Osogbo, Osun',city:'Osogbo',state:'Osun'}} } }]);
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
test('signup session redirects to fixed setup; confirmation-required does not', async () => {
  const a = actions({ data: { session: {} }, error: null }); const f = form(); f.set('next', 'https://evil.example');
  await assert.rejects(a.signUp(idle, f), e => e.destination === '/account/setup');
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
    '@/lib/auth/registration-config':{confirmationRedirectUrl:()=> 'https://store.example/auth/confirm'},
    '@/lib/supabase/server':{createClient:async options=>{assert(options.writableCookies);options.responseHeaders.set('Pragma','no-cache');return {auth:{verifyOtp:async input=>{calls.push(input);if(throws)throw Error('private diagnostic');return result;}}};}},
  }) };
}
const token='a'.repeat(56);
function confirmationPost(url){const params=new URL(url).searchParams;return new Request('https://store.example/auth/confirm',{method:'POST',headers:{origin:'https://store.example'},body:params});}
test('confirmation accepts only email type and correctly shaped single hash',async()=>{
  for(const query of ['', 'type=email', `token_hash=${token}`, ...[55,57,64].map(length => `type=email&token_hash=${'a'.repeat(length)}`), `type=email&token_hash=${'A'.repeat(56)}`, `type=email&token_hash=${'g'.repeat(56)}`,`type=recovery&token_hash=${token}`,`type=signup&token_hash=${token}`,`type=email&token_hash=bad`,`type=email&token_hash=${token}&token_hash=${token}`,`type=email&type=email&token_hash=${token}`]){
    const c=confirm();const res=await c.POST(confirmationPost('https://store.example/auth/confirm?'+query));assert.equal(res.headers.get('location'),'/login?confirmation=failed');assert.equal(c.calls.length,0);assert.equal(await res.text(),'');assert.doesNotMatch([...res.headers].join(''),new RegExp(token));
  }
});
test('confirmation uses SDK and fixed relative destination, preserving safe cache headers',async()=>{
  const c=confirm();const res=await c.POST(confirmationPost(`https://untrusted-host.example/auth/confirm?type=email&token_hash=${token}&next=https://evil.example`));
  assert.deepEqual(c.calls,[{token_hash:token,type:'email'}]);assert.equal(res.status,303);assert.equal(res.headers.get('location'),'/account/setup');assert.equal(res.headers.get('referrer-policy'),'same-origin');assert.match(res.headers.get('cache-control'),/no-store/);assert.equal(res.headers.get('pragma'),'no-cache');assert.doesNotMatch([...res.headers].join(''),new RegExp(token));
});
test('confirmation failures and exceptions return only fixed safe failure state',async()=>{
  for(const c of [confirm({data:{},error:{message:'private diagnostic'}}),confirm(undefined,true),confirm({data:{session:null},error:null})]){
    const res=await c.POST(confirmationPost(`https://store.example/auth/confirm?type=email&token_hash=${token}`));assert.equal(res.headers.get('location'),'/login?confirmation=failed');assert.equal(await res.text(),'');
  }
});
test('PKCE token reaches verifyOtp unchanged with email type and fixed success redirect',async()=>{
  const value='pkce_'+token;
  const c=confirm();const res=await c.POST(confirmationPost('https://store.example/auth/confirm?'+new URLSearchParams({type:'email',token_hash:value,next:'https://evil.example'})));
  assert.deepEqual(c.calls,[{token_hash:value,type:'email'}]);
  assert.equal(res.headers.get('location'),'/account/setup');
  assert.equal(await res.text(),'');assert(![...res.headers].join('').includes(value));
});
test('invalid PKCE lengths, characters and prefixes are rejected before verification',async()=>{
  const values=['pkce_'+'a'.repeat(55),'pkce_'+'a'.repeat(57),'pkce_'+'A'.repeat(56),'pkce_'+'g'.repeat(56),'pkce-'+token,'PKCE_'+token,'other_'+token,'pkce_','pkce_pkce_'+token];
  for(const value of values){
    const c=confirm();const res=await c.POST(confirmationPost('https://store.example/auth/confirm?'+new URLSearchParams({type:'email',token_hash:value})));
    assert.equal(c.calls.length,0);assert.equal(res.headers.get('location'),'/login?confirmation=failed');assert.equal(await res.text(),'');assert(![...res.headers].join('').includes(value));
  }
});
test('PKCE verification failure does not disclose token in errors or redirect',async()=>{
  const value='pkce_'+token;
  const c=confirm({data:{},error:{message:value}});
  const res=await c.POST(confirmationPost('https://store.example/auth/confirm?'+new URLSearchParams({type:'email',token_hash:value})));
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
  assert.doesNotMatch(source,/<Input\b[^>]*defaultValue=|value=\{.*password|dangerouslySetInnerHTML/);
});

test('registration rejects invalid contact details and mismatched/duplicate confirmation before Auth',async()=>{
  for (const [key,value] of [['full_name',''],['full_name','x'.repeat(101)],['phone','invalid'],['phone','123'],['address',''],['address','x'.repeat(301)],['confirm_password','different-password'],['city',''],['city','x'.repeat(101)],['state','Invalid State']]) {
    const a=actions(),f=form(); f.set(key,value); assert.equal((await a.signUp(idle,f)).status,'error'); assert.equal(a.calls.length,0);
  }
  for(const key of ['full_name','phone','address','city','state','confirm_password']) {
    const a=actions(),f=form(); f.append(key,String(f.get(key))); assert.equal((await a.signUp(idle,f)).status,'error'); assert.equal(a.calls.length,0);
  }
});
test('registration metadata is validated contact data only',()=>{
  assert.equal(validation.registrationContact({full_name:{},phone:'123',address:[]}),null);
  assert.deepEqual(validation.registrationContact({full_name:' Sample Fan ',phone:'+2348000000000',address:' Sample Street ',role:'admin'}),{full_name:'Sample Fan',phone:'+2348000000000',address:'Sample Street',city:'',state:''});
});

test('registration accepts all 36 Nigerian states and FCT, rejects arbitrary state values',async()=>{const states=load('src/lib/delivery.ts',{}).NIGERIAN_STATES;assert.equal(states.length,37);for(const state of states){const a=actions(),f=form();f.set('state',state);assert.equal((await a.signUp(idle,f)).status,'success');assert.equal(a.calls[0].input.options.data.state,state);}});

 test('scanner GET does not verify or consume confirmation and only forwards validated parameters',async()=>{
 const c=confirm();const res=await c.GET(new Request('https://untrusted.example/auth/confirm?type=email&token_hash='+token+'&next=https://evil.example'));
 assert.equal(c.calls.length,0);assert.equal(res.headers.get('location'),'/auth/confirm-email?token_hash='+token+'&type=email');assert.match(res.headers.get('cache-control'),/no-store/);assert.equal(res.headers.get('referrer-policy'),'same-origin');
});
test('confirmation POST rejects missing and foreign origins before Auth',async()=>{
 for(const origin of [null,'https://evil.example']){const c=confirm();const headers=origin?{origin}:{};const res=await c.POST(new Request('https://store.example/auth/confirm',{method:'POST',headers,body:new URLSearchParams({token_hash:token,type:'email'})}));assert.equal(res.status,403);assert.equal(c.calls.length,0);}
});
