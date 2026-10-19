// Direct execution: node tests/storefront-cutover.test.mjs. No live database.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const temp=mkdtempSync(join(tmpdir(),"jersey-cutover-"));
after(()=>{delete globalThis.__catalogueTest;rmSync(temp,{recursive:true,force:true});});
const compiled=new Map();
const mocks={
  "server-only": "module.exports={};",
  "next/navigation": 'exports.notFound=()=>{throw new Error("TEST_NOT_FOUND");};',
  "@/lib/supabase/server": 'exports.createClient=async()=>globalThis.__catalogueTest.client;',
  "react": 'module.exports={...require('+JSON.stringify(require.resolve('react'))+'),cache:fn=>fn};',
};
function load(path){
 const absolute=resolve(root,path);if(compiled.has(absolute))return compiled.get(absolute);
 const output=join(temp,compiled.size+".cjs");compiled.set(absolute,output);
 const result=ts.transpileModule(readFileSync(absolute,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace(/require\("([^"\n]+)"\)/g,(_,specifier)=>{
   let dependency;
   if(mocks[specifier]||specifier.startsWith("@/components/")||specifier==='next/link'){
     dependency=join(temp,"mock-"+Buffer.from(specifier).toString("hex")+".cjs");
     writeFileSync(dependency,mocks[specifier]??'module.exports=new Proxy({}, {get:(_,name)=>name});');
   }else if(specifier === "@sd/ui"){ dependency=load("packages/ui/src/index.tsx");
   }else if(specifier.startsWith("@/")||specifier.startsWith(".")){
     const base=specifier.startsWith("@/")?resolve(root,"src",specifier.slice(2)):resolve(dirname(absolute),specifier);
     dependency=load(base+(existsSync(base+".ts")?".ts":".tsx"));
   }else dependency=require.resolve(specifier);
   return 'require('+JSON.stringify(dependency)+')';
 });writeFileSync(output,result);return output;
}
const {products}=require(load("tests/fixtures/products.ts"));
const {normalizeProductId}=require(load("src/lib/products/identity.ts"));
let rows=products.map(p=>({id:normalizeProductId(p.id),name:"API: "+p.name,slug:p.slug,description:p.description,price_kobo:p.price*100,original_price_kobo:p.originalPrice===undefined?null:p.originalPrice*100,image_path:p.image,images:p.images,club:p.club??null,league:p.league??null,country:p.country??null,category:p.category,season:p.season,sizes:p.sizes,is_new:p.isNew,is_featured:p.isFeatured,is_best_seller:p.isBestSeller,in_stock:p.inStock,is_active:true,currency:"NGN"}));
let fail=false;let calls=[];
globalThis.__catalogueTest={client:{from(table){
 assert.equal(table,"products");const filters=[];let ordered=false;
 const q={select(value){assert.equal(value,"*");return q;},eq(key,value){filters.push([key,value]);return q;},order(key,options){assert.equal(key,"slug");assert.equal(options.ascending,true);ordered=true;return q;},
 then(resolve){return Promise.resolve(result(false)).then(resolve);},maybeSingle(){return Promise.resolve(result(true));}};
 function result(single){assert(ordered);assert(filters.some(([k,v])=>k==='is_active'&&v===true));calls.push(filters);
 if(fail)return {data:null,error:{message:"private diagnostic"}};
 const data=rows.filter(r=>filters.every(([k,v])=>r[k]===v)).sort((a,b)=>a.slug.localeCompare(b.slug));return {data:single?data[0]??null:data,error:null};}
 return q;
}}};
const queries=require(load("src/lib/products/queries.ts"));
const {NewArrivals}=require(load("src/components/home/new-arrivals.tsx"));
const {default:Shop}=require(load("src/app/shop/page.tsx"));
const {default:Detail,generateMetadata}=require(load("src/app/product/[slug]/page.tsx"));
const {getRelatedProducts}=require(load("src/lib/products.ts"));
const {filterAndSortProducts,sortOptions}=require(load("src/utils/product-catalogue.ts"));
function elements(tree){if(!tree||typeof tree!=='object')return [];return [tree,...[tree.props?.children].flat(Infinity).flatMap(elements)];}
const props=slug=>({params:Promise.resolve({slug})});
test("homepage and shop receive adapted API products, not static names",async()=>{
 const home=elements(await NewArrivals()).find(e=>e.type==='ProductGrid').props.products;
 assert.equal(home.length,5);assert(home.every(p=>p.name.startsWith('API: ')&&p.id.includes('-')));assert(home.slice(0,4).every(p=>p.isNew));
 const shop=elements(await Shop({searchParams:Promise.resolve({})})).find(e=>e.type==='ShopCatalogue').props.products;
 assert.equal(shop.length,12);assert(shop.every(p=>p.name.startsWith('API: ')));assert.equal(shop[0].slug,'ac-milan-home');
});
test("UUID catalogue retains combined filters and all sorting modes",async()=>{
 const catalogue=await queries.getProducts();const empty={club:'',league:'',category:'',size:''};
 const found=filterAndSortProducts(catalogue,{club:'Arsenal',league:'Premier League',category:'home',size:'M'},'featured');
 assert.equal(found.length,1);assert.equal(found[0].id,normalizeProductId('jersey-002'));
 assert.equal(filterAndSortProducts(catalogue,{...empty,club:'Arsenal',size:'3XL'},'featured').length,0);
 for(const {value} of sortOptions)assert.equal(filterAndSortProducts(catalogue,empty,value).length,12);
 const asc=filterAndSortProducts(catalogue,empty,'price-asc');assert(asc.every((p,i)=>!i||p.price>=asc[i-1].price));
 const desc=filterAndSortProducts(catalogue,empty,'price-desc');assert(desc.every((p,i)=>!i||p.price<=desc[i-1].price));
 assert(filterAndSortProducts(catalogue,empty,'featured')[0].isFeatured);assert(filterAndSortProducts(catalogue,empty,'newest')[0].isNew);
 assert.equal(catalogue[0].slug,'ac-milan-home');
});
test("detail/metadata map valid UUID row; related section uses one catalogue request",async()=>{
 calls=[];const tree=await Detail(props('arsenal-home'));assert.equal(calls.length,2);
 const action=elements(tree).find(e=>e.type==='ProductActions');assert.equal(action.props.product.id,normalizeProductId('jersey-002'));
 const metadata=await generateMetadata(props('arsenal-home'));assert.equal(metadata.title,'API: Arsenal Red Home Supporter Jersey | PappyLummy');
 const related=elements(tree).find(e=>e.type==='ProductGrid').props.products;assert(related.length<=4);assert(related.every(p=>p.id!==action.props.product.id&&p.name.startsWith('API: ')));
});
test("invalid, missing and inactive products take not-found path",async()=>{
 const before=calls.length;assert.equal(await queries.getProductBySlug('../bad'),null);assert.equal(calls.length,before);
 await assert.rejects(Detail(props('not-a-product')),/TEST_NOT_FOUND/);
 const old=rows;rows=rows.map(r=>r.slug==='arsenal-home'?{...r,is_active:false}:r);
 try{await assert.rejects(Detail(props('arsenal-home')),/TEST_NOT_FOUND/);await assert.rejects(generateMetadata(props('arsenal-home')),/TEST_NOT_FOUND/);}finally{rows=old;}
});
test("related ranking is deterministic even if input order changes",async()=>{
 const catalogue=await queries.getProducts(),p=catalogue.find(p=>p.slug==='arsenal-home');
 assert.deepEqual(getRelatedProducts(p,catalogue),getRelatedProducts(p,[...catalogue].reverse()));
 assert(getRelatedProducts(p,catalogue).every(r=>r.league===p.league));
});
test("AC Milan is publicly listed but passes unavailable state to actions",async()=>{
 assert((await queries.getProducts()).some(p=>p.slug==='ac-milan-home'));
 const action=elements(await Detail(props('ac-milan-home'))).find(e=>e.type==='ProductActions');assert.equal(action.props.product.inStock,false);
 const {useCartStore}=require(load('src/store/cart-store.ts'));useCartStore.setState({hydrated:true});assert.equal(useCartStore.getState().addItem(action.props.product,'M',1),false);
});
test("query errors fail visibly without raw diagnostics or static fallback",async()=>{
 fail=true;try{await assert.rejects(NewArrivals(),{message:'Unable to load products.'});await assert.rejects(Shop({searchParams:Promise.resolve({})}),{message:'Unable to load products.'});await assert.rejects(Detail(props('arsenal-home')),{message:'Unable to load product.'});}finally{fail=false;}
});


test('cart and wishlist server pages each fetch one current adapted snapshot', async()=>{
 const Cart=require(load('src/app/cart/page.tsx')).default;
 const Wishlist=require(load('src/app/wishlist/page.tsx')).default;
 for(const [Page,name] of [[Cart,'CartContents'],[Wishlist,'WishlistContents']]) {
  calls=[];const tree=await Page();assert.equal(calls.length,1);
  const snapshot=elements(tree).find(e=>e.type===name).props.products;
  assert.equal(snapshot.length,12);assert(snapshot.every(p=>p.name.startsWith('API: ')));
  fail=true;try{assert.equal(elements(await Page()).find(e=>e.type===name).props.products,null);}finally{fail=false;}
  const before=rows;rows=[];try{assert.deepEqual(elements(await Page()).find(e=>e.type===name).props.products,[]);}finally{rows=before;}
  rows=rows.map((r,i)=>i===0?{...r,currency:'BAD'}:r);
  try{assert.equal(elements(await Page()).find(e=>e.type===name).props.products,null);}finally{rows=before;}
 }
});

 test('national collection spans categories and excludes clubs with country metadata', async()=>{
 const catalogue=await queries.getProducts(); const base={club:'',league:'',category:'',size:'',teamType:'national'};
 const expected=['brazil-international','nigeria-home','nigeria-retro'];
 const national=filterAndSortProducts(catalogue,base,'name');
 assert.deepEqual(national.map(p=>p.slug).sort(),expected);
 assert(national.every(p=>!p.club && p.country));
 for(const team of ['Nigeria','Brazil','Arsenal']) {
 const ordinary=filterAndSortProducts(catalogue,{...base,teamType:'',club:team},'featured');
 assert.equal(ordinary.length,team==='Nigeria'?2:1);
 }
 assert.equal(filterAndSortProducts(catalogue,{...base,category:'retro'},'featured')[0].slug,'nigeria-retro');
 assert.equal(filterAndSortProducts(catalogue,{...base,club:'Arsenal'},'featured').length,0);
 for(const {value} of sortOptions) assert.equal(filterAndSortProducts(catalogue,base,value).length,3);
 const sorted=filterAndSortProducts(catalogue,base,'price-asc'); assert(sorted.every((p,i)=>!i||p.price>=sorted[i-1].price));
 });
 test('shop supplies catalogue without a competing initial filter snapshot', async()=>{
 const tree=elements(await Shop()).find(e=>e.type==='ShopCatalogue');
 assert.deepEqual(Object.keys(tree.props),['products']);
 assert.equal(tree.key,null);
 });
