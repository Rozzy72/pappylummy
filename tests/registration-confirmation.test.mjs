import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Module,createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file,mocks={}){const m=new Module(file);m.require=n=>Object.hasOwn(mocks,n)?mocks[n]:require(n);m._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const validation=load('src/lib/auth/validation.ts', {'@/lib/delivery':load('src/lib/delivery.ts',{})});
function harness({error=false,throws=false}={}){const calls=[];return {calls,...load('src/app/login/actions.ts',{'@/lib/auth/validation':validation,'@/lib/auth/registration-config':{confirmationRedirectUrl:()=> 'https://configured.example/auth/confirm'},'@/lib/supabase/server':{createClient:async()=>({auth:{resend:async value=>{calls.push(value);if(throws)throw Error('secret');return {error:error?{message:'private'}:null};}}})},'next/navigation':{redirect:()=>{throw Error('unexpected redirect');}}})};}
function form(email=' FAN@EXAMPLE.TEST '){const f=new FormData();f.set('email',email);f.set('next','https://attacker.invalid');f.set('type','recovery');return f;}
test('confirmation resend fixes signup type and configured callback, ignores supplied targets',async()=>{const h=harness();assert.equal((await h.resendConfirmation({},form())).status,'success');assert.deepEqual(h.calls,[{type:'signup',email:'fan@example.test',options:{emailRedirectTo:'https://configured.example/auth/confirm'}}]);});
test('resend does not disclose account existence, rate limits or provider errors',async()=>{const expected=await harness().resendConfirmation({},form());for(const h of [harness({error:true}),harness({throws:true})])assert.deepEqual(await h.resendConfirmation({},form()),expected);});
test('resend rejects malformed or duplicate email without API calls',async()=>{for(const f of [form('bad'),(()=>{const f=form();f.append('email','other@example.test');return f;})()]){const h=harness();assert.equal((await h.resendConfirmation({},f)).status,'error');assert.equal(h.calls.length,0);}});
test('confirmation destination shares validated application origin with recovery',()=>{const config=load('src/lib/auth/registration-config.ts',{'server-only':{},'./recovery-config':{recoveryRedirectUrl:()=> 'https://configured.example/auth/recovery'}});assert.equal(config.confirmationRedirectUrl(),'https://configured.example/auth/confirm');});
