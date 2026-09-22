import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { Module, createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(p,mocks={}){const m=new Module(p);m.require=n=>Object.hasOwn(mocks,n)?mocks[n]:require(n);m._compile(ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,p);return m.exports;}
const validation=load('src/lib/auth/validation.ts');
const idle={status:'idle',message:''};
const attacks=['https://example-attacker.invalid','//example-attacker.invalid','/%2F%2Fexample-attacker.invalid','https:%2F%2Fexample-attacker.invalid'];
const keys=['next','redirect','returnTo','callbackUrl','url','continue'];
const redirect=destination=>{throw Object.assign(Error('fixed redirect'),{destination});};
function input(value){const f=new FormData();f.set('email','synthetic@example.test');f.set('password','synthetic-password');for(const key of keys)f.set(key,value);f.set('userId','synthetic-other-user');return f;}
test('external/encoded/protocol-relative destinations cannot alter any auth action',async()=>{
  for(const value of attacks){
    const calls=[];const client={auth:{signInWithPassword:async c=>{calls.push(c);return {data:{session:{}},error:null};},signUp:async c=>{calls.push(c);return {data:{session:{}},error:null};},resetPasswordForEmail:async(...args)=>{calls.push(args);return {error:null};},updateUser:async c=>{calls.push(c);return {error:null};},signOut:async()=>({error:null})}};
    const mocks={'@/lib/auth/validation':validation,'@/lib/supabase/server':{createClient:async()=>client},'@/lib/auth/require-user':{requireUser:async()=>({client,userId:'synthetic-verified-user'})},'@/lib/auth/recovery-config':{recoveryRedirectUrl:()=> 'https://store.example/auth/recovery'},'next/navigation':{redirect},'next/cache':{revalidatePath:()=>{}}};
    const login=load('src/app/login/actions.ts',mocks);
    for(const fn of [login.signIn,login.signUp])await assert.rejects(fn(idle,input(value)),e=>e.destination==='/account');
    await load('src/app/forgot-password/actions.ts',mocks).requestPasswordReset(idle,input(value));
    await assert.rejects(load('src/app/reset-password/actions.ts',mocks).resetPassword(idle,input(value)),e=>e.destination==='/reset-password/complete');
    await assert.rejects(load('src/app/auth/sign-out/actions.ts',mocks).signOut(idle,input(value)),e=>e.destination==='/');
    assert.deepEqual(calls,[{email:'synthetic@example.test',password:'synthetic-password'},{email:'synthetic@example.test',password:'synthetic-password'},['synthetic@example.test',{redirectTo:'https://store.example/auth/recovery'}],{password:'synthetic-password'}]);
  }
});
test('confirmation ignores attacker destinations; recovery rejects extra parameters without exchanging',async()=>{
  for(const value of attacks)for(const key of keys){
    let exchanges=0;const mocks={'@/lib/auth/validation':validation,'@/lib/supabase/server':{createClient:async()=>({auth:{verifyOtp:async args=>{assert.deepEqual(args,{token_hash:'pkce_'+'a'.repeat(56),type:'email'});return {data:{session:{}},error:null};},exchangeCodeForSession:async()=>{exchanges++;return {data:{session:{}},error:null};}}})}};
    const params=new URLSearchParams({token_hash:'pkce_'+'a'.repeat(56),type:'email',[key]:value});
    const result=await load('src/app/auth/confirm/route.ts',mocks).GET(new Request('https://untrusted.example/auth/confirm?'+params));
    assert.equal(result.headers.get('location'),'/account');assert.equal(await result.text(),'');
    const recovery=await load('src/app/auth/recovery/route.ts',mocks).GET(new Request('https://untrusted.example/auth/recovery?'+new URLSearchParams({code:'synthetic-code',[key]:value})));
    assert.equal(recovery.headers.get('location'),'/login?recovery=failed');assert.equal(exchanges,0);
  }
});
test('encoded duplicate parameter names fail before any verification call',async()=>{
  const mocks={'@/lib/auth/validation':validation,'@/lib/supabase/server':{createClient:()=>{assert.fail('must not create client');}}};
  const confirm=await load('src/app/auth/confirm/route.ts',mocks).GET(new Request('https://store.example/auth/confirm?token_hash='+ 'a'.repeat(56)+'&%74oken_hash='+ 'a'.repeat(56)+'&type=email'));
  assert.equal(confirm.headers.get('location'),'/login?confirmation=failed');
  const recovery=await load('src/app/auth/recovery/route.ts',mocks).GET(new Request('https://store.example/auth/recovery?code=synthetic&%63ode=synthetic'));
  assert.equal(recovery.headers.get('location'),'/login?recovery=failed');
});
test('SDK rejects replay/expired callbacks without leaking its error payload',async()=>{
  for(const path of ['confirm','recovery']){
    let count=0;const verify=async()=>++count===1?{data:{session:{}},error:null}:{data:{session:null},error:{message:'synthetic-private-diagnostic'}};
    const route=load('src/app/auth/'+path+'/route.ts',{'@/lib/auth/validation':validation,'@/lib/supabase/server':{createClient:async()=>({auth:{verifyOtp:verify,exchangeCodeForSession:verify}})}});
    const query=path==='confirm'?'token_hash='+ 'a'.repeat(56)+'&type=email':'code=synthetic';
    const request=()=>new Request('https://store.example/auth/'+path+'?'+query);
    await route.GET(request());const replay=await route.GET(request());assert.match(replay.headers.get('location'),/^\/login\?/);assert.equal(await replay.text(),'');assert.doesNotMatch([...replay.headers].join(''),/synthetic|diagnostic/);
  }
});
test('installed Server Actions boundary checks origins and actions are not GET endpoints',()=>{
  const source=read('node_modules/next/dist/server/app-render/action-handler.js');assert.match(source,/originHost !== host.value/);assert.match(source,/Invalid Server Actions request/);
  const info=read('node_modules/next/dist/server/lib/server-action-request-meta.js');assert.match(info,/POST/);
  for(const p of ['src/app/login/actions.ts','src/app/forgot-password/actions.ts','src/app/reset-password/actions.ts','src/app/auth/sign-out/actions.ts']){assert.match(read(p),/^"use server"/);assert.doesNotMatch(read(p),/export.*function GET/);}
});
test('shopping persistence contains no identity and auth actions never import stores',()=>{
  for(const p of ['src/store/cart-store.ts','src/store/wishlist-store.ts','src/store/reconcile-persisted-items.ts'])assert.doesNotMatch(read(p),/supabase|access_token|refresh_token|userId|profileId/);
  for(const p of ['src/app/login/actions.ts','src/app/auth/sign-out/actions.ts'])assert.doesNotMatch(read(p),/store\/|localStorage|sessionStorage|clearCart|clearWishlist/);
});
