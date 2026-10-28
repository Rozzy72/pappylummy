import { loadUi } from './ui-loader.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { Module, createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL('../'+file, import.meta.url),'utf8');
function load(file, mocks={}) {
  const m=new Module(file);m.require=name=>name==='@sd/ui'?loadUi():Object.hasOwn(mocks,name)?mocks[name]:require(name);
  m._compile(ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);return m.exports;
}
const validation=load('src/lib/auth/validation.ts', {'@/lib/delivery':load('src/lib/delivery.ts',{})});
const idle={status:'idle',message:''};
const redirect=destination=>{throw Object.assign(Error('redirect'),{destination});};
function form(key,value){const f=new FormData();f.set(key,value);return f;}
function requestHarness({error=null,throws=false,configThrows=false}={}){
  const calls=[];
  const action=load('src/app/forgot-password/actions.ts',{
    '@/lib/auth/validation':validation,
    '@/lib/auth/recovery-config':{recoveryRedirectUrl:()=>{if(configThrows)throw Error('private config');return 'https://store.example/auth/recovery';}},
    '@/lib/supabase/server':{createClient:async options=>{assert.equal(options.writableCookies,true);return {auth:{resetPasswordForEmail:async(...args)=>{calls.push(args);if(throws)throw Error('private auth');return {data:null,error};}}};}},
  });return {...action,calls};
}
function callbackHarness({error=null,session={},throws=false}={}){
  const calls=[];
  const route=load('src/app/auth/recovery/route.ts',{
    '@/lib/auth/validation':validation,
    '@/lib/supabase/server':{createClient:async options=>{assert.equal(options.writableCookies,true);options.responseHeaders.set('Pragma','no-cache');return {auth:{exchangeCodeForSession:async code=>{calls.push(code);if(throws)throw Error('private auth');return {data:{session},error};}}};}},
  });return {...route,calls};
}
const callbackRequest=query=>new Request('https://untrusted.example/auth/recovery?'+query);
function resetHarness({user={id:'synthetic-user-a'},authError=null,authThrows=false,updateError=null,updateThrows=false}={}){
  const calls=[];
  const client={auth:{getUser:async()=>{calls.push('getUser');if(authThrows)throw Error('private auth');return {data:{user},error:authError};},updateUser:async attributes=>{calls.push(attributes);if(updateThrows)throw Error('private auth');return {data:{user},error:updateError};}}};
  const helper=load('src/lib/auth/require-user.ts',{'server-only':{},'next/navigation':{redirect},'@/lib/supabase/server':{createClient:async options=>{calls.push(['client',options]);return client;}}});
  const mocks={'@/lib/auth/require-user':helper,'@/lib/auth/validation':validation,'next/navigation':{redirect},'@/components/auth/password-recovery-form':{PasswordRecoveryForm:()=>null}};
  return {calls,action:load('src/app/reset-password/actions.ts',mocks),page:load('src/app/reset-password/page.tsx',mocks)};
}
test('login links to forgot password and request/reset UI have accessible controls',()=>{
  assert.match(read('src/app/login/page.tsx'),/href="\/forgot-password"/);
  const ui=read('src/components/auth/password-recovery-form.tsx');
  for(const s of ['htmlFor=','autoComplete="email"','autoComplete="new-password"','disabled={pending}','aria-live="polite"','passwordRef.current.value = ""'])assert(ui.includes(s));
  assert.doesNotMatch(ui,/defaultValue|localStorage|sessionStorage/);
});
test('valid email trimmed and normalized; server sets fixed recovery URL',async()=>{
  const h=requestHarness();const result=await h.requestPasswordReset(idle,form('email','  Synthetic@Example.test '));
  assert.equal(result.status,'success');assert.deepEqual(h.calls,[['synthetic@example.test',{redirectTo:'https://store.example/auth/recovery'}]]);
});
test('missing, duplicate, malformed, oversized and File email rejected before SDK',async()=>{
  const cases=[new FormData(),...['','bad','a@@b.test','a b@example.test','x'.repeat(255)+'@example.test'].map(v=>form('email',v))];
  const dup=form('email','synthetic@example.test');dup.append('email','second@example.test');cases.push(dup);
  const file=new FormData();file.set('email',new Blob(['synthetic']));cases.push(file);
  for(const f of cases){const h=requestHarness();assert.equal((await h.requestPasswordReset(idle,f)).status,'error');assert.equal(h.calls.length,0);}
});
test('nonexistent account, provider, rate limit, network and config failures share public response',async()=>{
  const f=form('email','synthetic@example.test');const expected=await requestHarness().requestPasswordReset(idle,f);
  for(const options of [{error:{message:'user missing'}},{error:{message:'provider mismatch'}},{error:{message:'rate limited'}},{throws:true},{configThrows:true}])assert.deepEqual(await requestHarness(options).requestPasswordReset(idle,f),expected);
  assert.doesNotMatch(JSON.stringify(expected),/synthetic@example|private auth|provider mismatch/);
});
test('request input cannot override callback or supply identity to SDK',async()=>{
  const f=form('email','synthetic@example.test');for(const key of ['redirectTo','next','returnTo','callback','userId','profileId','role'])f.set(key,'https://evil.example');
  const h=requestHarness();await h.requestPasswordReset(idle,f);assert.deepEqual(h.calls,[['synthetic@example.test',{redirectTo:'https://store.example/auth/recovery'}]]);
});
test('origin configuration never trusts request headers; production requires explicit HTTPS origin',()=>{
  const {recoveryRedirectUrl}=load('src/lib/auth/recovery-config.ts',{'server-only':{}});
  const oldEnv=process.env.NODE_ENV,oldOrigin=process.env.APP_ORIGIN;
  try{
    process.env.NODE_ENV='development';delete process.env.APP_ORIGIN;assert.equal(recoveryRedirectUrl(),'http://localhost:3000/auth/recovery');
    process.env.NODE_ENV='production';assert.throws(recoveryRedirectUrl);
    for(const value of ['http://store.example','https://user:pass@store.example','https://store.example/path','https://store.example?next=bad','https://store.example/#bad']){process.env.APP_ORIGIN=value;assert.throws(recoveryRedirectUrl);}
    process.env.APP_ORIGIN='https://store.example';assert.equal(recoveryRedirectUrl(),'https://store.example/auth/recovery');
  }finally{if(oldEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldEnv;if(oldOrigin===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=oldOrigin;}
});
test('callback missing/duplicate/empty code rejected without exchange',async()=>{
  for(const query of ['', 'code=', 'code=synthetic&code=second']){const h=callbackHarness();const r=await h.GET(callbackRequest(query));assert.equal(r.headers.get('location'),'/login?recovery=failed');assert.equal(h.calls.length,0);}
});
test('callback rejects whitespace, control characters, non-ASCII and unreasonable length',async()=>{
  for(const code of [' code','code\n','\u0000','é','x'.repeat(2049)]){const h=callbackHarness();await h.GET(callbackRequest(new URLSearchParams({code})));assert.equal(h.calls.length,0);}
});
test('opaque non-hex code passed unchanged to exchange API with fixed success redirect',async()=>{
  const code='synthetic-Code_+/=.-';const h=callbackHarness();const r=await h.GET(callbackRequest(new URLSearchParams({code})));
  assert.deepEqual(h.calls,[code]);assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/reset-password');assert.equal(await r.text(),'');assert(![...r.headers].join('').includes(code));
});
test('callback rejects arbitrary redirect parameters and token-hash parameters',async()=>{
  for(const key of ['next','returnTo','redirect','callback','token_hash','type']){const h=callbackHarness();const r=await h.GET(callbackRequest(new URLSearchParams({code:'synthetic', [key]:'https://evil.example'})));assert.equal(h.calls.length,0);assert.equal(r.headers.get('location'),'/login?recovery=failed');}
});
test('expired/reused/invalid exchange, absent session and exceptions fail safely',async()=>{
  for(const options of [{error:{message:'expired'}},{error:{message:'used'}},{session:null},{throws:true}]){const h=callbackHarness(options);const r=await h.GET(callbackRequest('code=synthetic-code'));assert.equal(r.headers.get('location'),'/login?recovery=failed');assert.equal(await r.text(),'');assert.doesNotMatch([...r.headers].join(''),/synthetic-code|expired|private auth/);}
});
test('callback retains private cache headers and no-referrer policy',async()=>{
  const r=await callbackHarness().GET(callbackRequest('code=synthetic'));assert.match(r.headers.get('cache-control'),/private.*no-store/);assert.equal(r.headers.get('pragma'),'no-cache');assert.equal(r.headers.get('referrer-policy'),'no-referrer');
});
test('real server adapter carries exchange cookie writes and SSR headers',async()=>{
  const writes=[];
  const server=load('src/lib/supabase/server.ts',{
    'server-only':{},'next/headers':{cookies:async()=>({getAll:()=>[],set:(...args)=>writes.push(args)})},
    '@/lib/supabase/config':{getSupabasePublicConfig:()=>({url:'https://synthetic.supabase.co',publishableKey:'sb_publishable_synthetic'})},
    '@supabase/ssr':{createServerClient:(_url,_key,options)=>({auth:{exchangeCodeForSession:async()=>{options.cookies.setAll([{name:'synthetic-session',value:'synthetic-only',options:{httpOnly:false,secure:true,path:'/',sameSite:'lax'}}],{'Cache-Control':'private, no-store'});return {data:{session:{}},error:null};}}})},
  });
  const route=load('src/app/auth/recovery/route.ts',{'@/lib/supabase/server':server,'@/lib/auth/validation':validation});
  const r=await route.GET(callbackRequest('code=synthetic'));assert.deepEqual(writes,[['synthetic-session','synthetic-only',{httpOnly:false,secure:true,path:'/',sameSite:'lax'}]]);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('location'),'/reset-password');
});
test('anonymous reset page and action denied with no password update',async()=>{
  const h=resetHarness({user:null});await assert.rejects(h.page.default(),e=>e.destination==='/login');await assert.rejects(h.action.resetPassword(idle,form('password','synthetic123')),e=>e.destination==='/login');assert(!h.calls.some(c=>c?.password));
});
test('auth error or thrown verification fails closed before update',async()=>{
  for(const options of [{authError:{message:'private'}},{authThrows:true}]){const h=resetHarness(options);await assert.rejects(h.action.resetPassword(idle,form('password','synthetic123')),e=>e.destination==='/login');assert(!h.calls.some(c=>c?.password));}
});
test('reset page verifies user independently and is dynamic',async()=>{
  const h=resetHarness();await h.page.default();assert.equal(h.page.dynamic,'force-dynamic');assert.deepEqual(h.calls,[['client',{writableCookies:false}],'getUser']);
});
test('12-character password accepted only after verified identity and redirects fixed',async()=>{
  const h=resetHarness();await assert.rejects(h.action.resetPassword(idle,form('password','synthetic123')),e=>e.destination==='/reset-password/complete');
  assert.deepEqual(h.calls,[['client',{writableCookies:true}],'getUser',{password:'synthetic123'}]);
});
test('128-character password accepted unchanged',async()=>{
  const h=resetHarness();const value='x'.repeat(128);await assert.rejects(h.action.resetPassword(idle,form('password',value)),e=>e.destination==='/reset-password/complete');assert.equal(h.calls.at(-1).password,value);
});
test('short, long, missing, duplicate and File passwords rejected without update',async()=>{
  const cases=[new FormData(),...['','x'.repeat(11),'x'.repeat(129)].map(v=>form('password',v))];const dup=form('password','synthetic123');dup.append('password','synthetic123');cases.push(dup);const file=new FormData();file.set('password',new Blob(['synthetic']));cases.push(file);
  for(const f of cases){const h=resetHarness();const state=await h.action.resetPassword(idle,f);assert.equal(state.status,'error');assert(!h.calls.some(c=>c?.password));}
});
test('update ignores supplied identity/email/redirects and sends only password',async()=>{
  const h=resetHarness();const f=form('password','synthetic123');for(const key of ['userId','profileId','email','role','next','redirect','returnTo','callback'])f.set(key,'https://evil.example');await assert.rejects(h.action.resetPassword(idle,f),e=>e.destination==='/reset-password/complete');assert.deepEqual(h.calls.at(-1),{password:'synthetic123'});
});
test('update errors do not expose password or Auth diagnostics in state',async()=>{
  for(const options of [{updateError:{message:'synthetic123 private'}},{updateThrows:true}]){const h=resetHarness(options);const state=await h.action.resetPassword(idle,form('password','synthetic123'));assert.equal(state.status,'error');assert.doesNotMatch(JSON.stringify(state),/synthetic123|private|synthetic-user/);}
});
test('reset and signup share the unchanged password policy',()=>{
  for(const length of [11,12,128,129]){const f=form('password','x'.repeat(length));f.set('email','synthetic@example.test');assert.equal(Boolean(validation.readPassword(f)),Boolean(validation.readCredentials(f,true)));}
});
test('no recovery flags, raw diagnostics, sensitive logging, stores or privileged access',()=>{
  const paths=['src/app/forgot-password/actions.ts','src/app/auth/recovery/route.ts','src/app/reset-password/actions.ts','src/app/reset-password/page.tsx','src/components/auth/password-recovery-form.tsx'];
  for(const file of paths)assert.doesNotMatch(read(file),/console\.|error\.message\b|localStorage|sessionStorage|zustand|service_role|sb_secret_|PASSWORD_RECOVERY|dangerouslySetInnerHTML/);
});
test('installed SSR SDK persists PKCE verifier in cookie adapter and exchanges code using it',async()=>{
  const {createServerClient}=require('@supabase/ssr');
  const jar=new Map();const calls=[];const writes=[];
  const options={cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:(values,headers)=>{writes.push({count:values.length,headers});for(const {name,value,options} of values){if(options?.maxAge===0)jar.delete(name);else jar.set(name,value);}}},global:{fetch:async(url,init)=>{
    const parsed=new URL(url);const body=JSON.parse(init.body);calls.push({path:parsed.pathname,query:parsed.searchParams,body});
    if(parsed.pathname.endsWith('/recover'))return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});
    if(parsed.pathname.endsWith('/token'))return new Response(JSON.stringify({access_token:'synthetic-access',refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,user:{id:'synthetic-user',aud:'authenticated',role:'authenticated'}}),{status:200,headers:{'Content-Type':'application/json'}});
    throw Error('Unexpected synthetic SDK request');
  }}};
  const first=createServerClient('https://synthetic.supabase.co','sb_publishable_synthetic',options);
  const requested=await first.auth.resetPasswordForEmail('synthetic@example.test',{redirectTo:'https://store.example/auth/recovery'});assert.equal(requested.error,null);
  assert.equal(calls.length,1);assert.equal(calls[0].query.get('redirect_to'),'https://store.example/auth/recovery');assert.equal(calls[0].body.code_challenge_method,'s256');assert.equal(typeof calls[0].body.code_challenge,'string');assert([...jar.keys()].some(key=>key.endsWith('-code-verifier')));
  const second=createServerClient('https://synthetic.supabase.co','sb_publishable_synthetic',options);
  const exchanged=await second.auth.exchangeCodeForSession('synthetic-opaque-code');assert.equal(exchanged.error,null);assert(exchanged.data.session);
  assert.equal(calls[1].body.auth_code,'synthetic-opaque-code');assert.equal(typeof calls[1].body.code_verifier,'string');assert(calls[1].body.code_verifier.length>0);
  assert(writes.some(write=>/no-store/.test(write.headers?.['Cache-Control']??'')));
  assert([...jar.keys()].some(key=>key.endsWith('-auth-token')));
});
test('proxy marks recovery pages private even without incoming session cookies',async()=>{
  const {NextRequest,NextResponse}=require('next/server');
  const proxy=load('src/lib/supabase/proxy.ts',{'server-only':{},'next/server':{NextResponse},'@/lib/supabase/config':{getSupabasePublicConfig:()=>({url:'https://synthetic.supabase.co',publishableKey:'sb_publishable_synthetic'})},'@supabase/ssr':{createServerClient:()=>({auth:{getClaims:async()=>({data:null,error:null})}})}});
  for(const path of ['/forgot-password','/reset-password','/reset-password/complete','/auth/recovery']){const r=await proxy.updateSession(new NextRequest('https://store.example'+path));assert.match(r.headers.get('cache-control'),/private.*no-store/);}
});

function recoveryFeedback(state, mode='request') {
  const {PasswordRecoveryForm}=load('src/components/auth/password-recovery-form.tsx',{
    react:{useRef:()=>({current:null}),useActionState:()=>[state,()=>{},false]},
    '@/app/forgot-password/actions':{requestPasswordReset:()=>{}},
    '@/app/reset-password/actions':{resetPassword:()=>{}},
  });
  return PasswordRecoveryForm({mode}).props.children.find(child=>child?.props?.role==='status');
}

test('request success has an atomic polite status banner with exact generic wording',async()=>{
  const state=await requestHarness().requestPasswordReset(idle,form('email','synthetic@example.test'));
  const feedback=recoveryFeedback(state);
  assert.equal(feedback.props.children,'If an account exists for that email, password reset instructions have been sent.');
  assert.equal(feedback.props['aria-live'],'polite');
  assert.equal(feedback.props['aria-atomic'],'true');
  const rendered=feedback.type(feedback.props);
  assert.match(rendered.props.className,/border-l-4/);
  assert.match(rendered.props.className,/bg-material/);
  assert.match(rendered.props.className,/p-s4/);
  assert.equal(recoveryFeedback(idle).props.children,'');
  assert.equal(recoveryFeedback(idle).props.emphasized,false);
  assert.equal(recoveryFeedback({status:'error',message:'Generic error'}).props.emphasized,false);
});

test('success feedback is identical for missing accounts and failures and excludes private data',async()=>{
  const expected=await requestHarness().requestPasswordReset(idle,form('email','synthetic@example.test'));
  for(const options of [{},{error:{message:'synthetic private error',userId:'synthetic-user',access_token:'synthetic-token'}},{error:{message:'user missing'}},{throws:true},{configThrows:true}]){
    const state=await requestHarness(options).requestPasswordReset(idle,form('email','other@example.test'));
    assert.deepEqual(state,expected);
    const feedback=recoveryFeedback(state);
    assert.deepEqual(feedback.props,recoveryFeedback(expected).props);
    assert.doesNotMatch(JSON.stringify(feedback.props),/example.test|synthetic|access_token|userId|cookie|session/);
  }
});

test('recovery token verification is recovery-only and uses fixed destination', async()=>{
 const calls=[];
 const route=load('src/app/auth/recovery/route.ts',{'@/lib/auth/validation':validation,'@/lib/supabase/server':{createClient:async()=>({auth:{verifyOtp:async input=>{calls.push(input);return {data:{session:{}},error:null};}}})}});
 const token='a'.repeat(56);
 const response=await route.GET(callbackRequest('token_hash='+token+'&type=recovery'));
 assert.equal(response.headers.get('location'),'/reset-password');assert.deepEqual(calls,[{token_hash:token,type:'recovery'}]);assert(![...response.headers].join('').includes(token));
 for(const query of ['token_hash='+token+'&type=email','token_hash='+token+'&type=recovery&next=/account','token_hash=bad&type=recovery','token_hash='+token+'&token_hash='+token+'&type=recovery'])await route.GET(callbackRequest(query));
 assert.equal(calls.length,1);
});
test('invalid recovery token cannot create a reset session',async()=>{
 const route=load('src/app/auth/recovery/route.ts',{'@/lib/auth/validation':validation,'@/lib/supabase/server':{createClient:async()=>({auth:{verifyOtp:async()=>({data:{session:null},error:{message:'private'}})}})}});
 const response=await route.GET(callbackRequest('token_hash='+'b'.repeat(56)+'&type=recovery'));assert.equal(response.headers.get('location'),'/login?recovery=failed');assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.match(response.headers.get('cache-control'),/no-store/);
});
