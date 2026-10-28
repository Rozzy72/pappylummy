import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {Module,createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(file,mocks={}){const m=new Module(file);m.require=n=>Object.hasOwn(mocks,n)?mocks[n]:require(n);m._compile(ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);return m.exports;}
const receipt=load('src/lib/checkout/receipt.ts',{'server-only':{}});
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',secret='synthetic-test-secret',now=1800000000000;
test('signed receipt contains no delivery data and verifies only with correct server secret',()=>{const token=receipt.signReceipt(id,secret,now);assert.equal(receipt.verifyReceipt(token,secret,now),id);assert.equal(receipt.verifyReceipt(token,'wrong-secret',now),null);assert.deepEqual(Object.keys(JSON.parse(Buffer.from(token.split('.')[0],'base64url').toString())).sort(),['expires','reference']);});
test('receipt rejects tampering, malformed values, expiration and invalid ids',()=>{const token=receipt.signReceipt(id,secret,now);const parts=token.split('.');const payload=JSON.parse(Buffer.from(parts[0],'base64url').toString());payload.reference=other;assert.equal(receipt.verifyReceipt(Buffer.from(JSON.stringify(payload)).toString('base64url')+'.'+parts[1],secret,now),null);for(const value of [null,{},'',token+'.extra','x'.repeat(513),'bad.bad'])assert.equal(receipt.verifyReceipt(value,secret,now),null);assert.equal(receipt.verifyReceipt(token,secret,now+86400000),null);assert.equal(receipt.verifyReceipt(token,secret,now-1000),null);assert.throws(()=>receipt.signReceipt('not-a-reference',secret,now));});
function harness({cookies=[],enabled=true,error=null,data=null}={}) {
 let clients=0;const calls=[];
 const client={from(table){assert.equal(table,'guest_order_requests');return {select(columns){calls.push(columns);return {eq(key,value){calls.push({key,value});return {maybeSingle:async()=>({data,error})};}};}};}};
 const loaded=load('src/lib/checkout/confirmation.ts',{
  'server-only':{},
  'next/headers':{cookies:async()=>({getAll:name=>{assert.equal(name,receipt.RECEIPT_COOKIE);return cookies;}})},
  './config':{guestOrdersEnabled:()=>enabled},
  './receipt':{...receipt,verifyReceipt:token=>receipt.verifyReceipt(token,secret,now)},
  '@/lib/supabase/config':{getSupabasePublicConfig:()=>({url:'https://synthetic.supabase.co'})},
  '@supabase/supabase-js':{createClient:()=>{clients++;return client;}}
 });return {...loaded,calls,get clients(){return clients;}};
}
test('missing, forged and duplicate receipt cookies cannot query orders',async()=>{for(const cookies of [[],[{value:'forged'}],[{value:receipt.signReceipt(id,secret,now)},{value:receipt.signReceipt(other,secret,now)}]]){const h=harness({cookies});assert.equal((await h.getOrderConfirmation()).status,'missing');assert.equal(h.clients,0);}const h=harness({enabled:false});assert.equal((await h.getOrderConfirmation()).status,'unavailable');assert.equal(h.clients,0);});
const order={id,status:'awaiting_payment',created_at:'2026-10-19T00:00:00Z',subtotal_kobo:4100000,delivery_fee_kobo:200000,total_kobo:4300000,delivery:{name:'Synthetic Fan',email:'guest@example.test',phone:'+2348000000000',address:'1 Test Road',city:'Osogbo',state:'Osun'},items:[{productId:other,name:'Synthetic Shirt',size:'L',quantity:1,unitPriceKobo:4100000,personalization:{name:'FAN',number:'10',font:'Bold'}}]};
test('confirmation reads only the order authorized by the verified cookie',async()=>{const h=harness({cookies:[{value:receipt.signReceipt(id,secret,now)}],data:order});const result=await h.getOrderConfirmation();assert.equal(result.status,'ready');assert.deepEqual(h.calls[1],{key:'id',value:id});assert(!h.calls[0].includes('request_key'));assert(!h.calls[0].includes('request_fingerprint'));});
test('database errors, other order ids and invalid totals fail closed',async()=>{for(const options of [{error:{message:'private-database-error'}},{data:{...order,id:other}},{data:{...order,total_kobo:1}},{data:{...order,status:'paid'}},{data:{...order,items:[]}}]){const h=harness({...options,cookies:[{value:receipt.signReceipt(id,secret,now)}]});assert.equal((await h.getOrderConfirmation()).status,'unavailable');}const h=harness({cookies:[{value:receipt.signReceipt(id,secret,now)}]});assert.equal((await h.getOrderConfirmation()).status,'missing');});
test('confirmation stays private, displays unpaid status and does not expose printing fonts',()=>{const page=read('src/app/checkout/confirmation/page.tsx');assert.match(page,/force-dynamic/);assert.match(page,/index:false,follow:false/);assert.match(page,/Awaiting payment/);assert.match(page,/nothing has been charged/);assert.doesNotMatch(page,/item.personalization.font|searchParams/);const action=read('src/app/checkout/actions.ts');for(const flag of ['httpOnly:true','sameSite:"lax"','secure:process.env.NODE_ENV===','path:"/checkout"'])assert(action.includes(flag));assert(read('src/components/checkout/checkout-review.tsx').includes('router.push("/checkout/confirmation")'));});
