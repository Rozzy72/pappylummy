import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {Module,createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file,mocks={}){const m=new Module(file);m.require=n=>Object.hasOwn(mocks,n)?mocks[n]:require(n);m._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const validation=load('src/lib/auth/validation.ts',{'@/lib/delivery':load('src/lib/delivery.ts')});
function form(){const f=new FormData();for(const [k,v] of Object.entries({full_name:'Registration Test',email:'fan@example.test',phone:'+2348000000000',address:'Sample Road',city:'Ikeja',state:'Lagos',password:'synthetic-password',confirm_password:'synthetic-password'}))f.set(k,v);return f;}
test('every required registration field has specific missing-field feedback before any signup call',async()=>{
 const actions=load('src/app/login/actions.ts',{'@/lib/auth/validation':validation,'@/lib/auth/registration-config':{},'@/lib/supabase/server':{createClient:()=>assert.fail('must reject before Auth')},'next/navigation':{}});
 for(const field of ['full_name','email','phone','address','city','state','password','confirm_password']){const f=form();f.delete(field);const result=await actions.signUp({},f);assert.equal(result.status,'error');assert(result.fieldErrors[field]);assert(!JSON.stringify(result).includes('synthetic-password'));}
 assert.deepEqual(validation.registrationErrors(form()),{});
});
test('whitespace-only contact fields, invalid state and mismatched passwords have individual errors',()=>{
 const f=form();for(const key of ['full_name','address','city','phone'])f.set(key,'   ');f.set('state','Not a state');f.set('email','bad');f.set('confirm_password','different');const errors=validation.registrationErrors(f);for(const key of ['full_name','address','city','phone','state','email','confirm_password'])assert(errors[key]);assert(!errors.password);
});
test('confirmation initializes only the verified users empty profile from validated registration contact',async()=>{
 const calls=[];const chain={eq:(...a)=>{calls.push(['eq',...a]);return chain;},is:(...a)=>{calls.push(['is',...a]);return chain;},then:resolve=>resolve({error:null})};const client={from:table=>({update:values=>{calls.push({table,values});return chain;}})};
 const {initializeRegistrationProfile}=load('src/lib/auth/initialize-registration-profile.ts',{'server-only':{},'@/lib/auth/validation':validation});
 const data=Object.fromEntries(form());data.role='admin';data.id='attacker';
 await initializeRegistrationProfile(client,{id:'verified-auth-user',user_metadata:data});
 assert.deepEqual(calls,[{table:'profiles',values:{full_name:'Registration Test',phone:'+2348000000000'}},['eq','id','verified-auth-user'],['is','full_name',null],['is','phone',null]]);
 calls.length=0;await initializeRegistrationProfile(client,{id:'verified-auth-user',user_metadata:{full_name:'Incomplete'}});assert.equal(calls.length,0);
});
test('confirmation initializes profile only after successful verification and UI identifies invalid fields',()=>{
 const route=readFileSync('src/app/auth/confirm/route.ts','utf8');assert(route.indexOf('if(!error && data.session)')<route.indexOf('await initializeRegistrationProfile'));assert(route.includes('initializeRegistrationProfile(client,data.user)'));
 const ui=readFileSync('src/components/auth/auth-form.tsx','utf8');for(const key of ['full_name','email','phone','address','city','state','password','confirm_password'])assert(ui.includes('errors.'+key));assert(ui.includes('event.preventDefault()'));assert(ui.includes('control.focus()'));assert(ui.includes('role="alert"'));
});

test('confirmation document privacy policy preserves native same-origin form Origin',()=>{const page=readFileSync('src/app/auth/confirm-email/page.tsx','utf8'),proxy=readFileSync('src/lib/supabase/proxy.ts','utf8');assert(page.includes('referrer:"same-origin"'));assert(!page.includes('no-referrer'));assert(proxy.includes('cacheHeaders.set("Referrer-Policy", "same-origin")'));});
