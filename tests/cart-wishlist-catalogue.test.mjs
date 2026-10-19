// Direct execution: node tests/storefront-cutover.test.mjs. No live database.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const temp=mkdtempSync(join(tmpdir(),"jersey-cutover-"));
after(()=>{delete globalThis.__selectionTest;rmSync(temp,{recursive:true,force:true});});
const compiled=new Map();
const mocks={
  "@/store/cart-store": 'exports.MAX_CART_QUANTITY=10;exports.selectTotalItems=s=>s.items.reduce((n,i)=>n+i.quantity,0);exports.useCartStore=selector=>selector(globalThis.__selectionTest.cart);',
  "@/store/wishlist-store": 'exports.useWishlistStore=selector=>selector(globalThis.__selectionTest.wishlist);',
  "@/components/cart/use-cart-hydration": 'exports.useCartHydration=()=>globalThis.__selectionTest.hydrated;',
  "@/components/wishlist/use-wishlist-hydration": 'exports.useWishlistHydration=()=>globalThis.__selectionTest.hydrated;',
  "server-only": "module.exports={};",
  "next/navigation": 'exports.notFound=()=>{throw new Error("TEST_NOT_FOUND");};',
  "@/lib/supabase/server": 'exports.createClient=async()=>globalThis.__selectionTest.client;',
  "react": 'module.exports={...require('+JSON.stringify(require.resolve('react'))+'),cache:fn=>fn};',
};
function load(path){
 const absolute=resolve(root,path);if(compiled.has(absolute))return compiled.get(absolute);
 const output=join(temp,compiled.size+".cjs");compiled.set(absolute,output);
 const result=ts.transpileModule(readFileSync(absolute,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace(/require\("([^"\n]+)"\)/g,(_,specifier)=>{
   let dependency;
   if(mocks[specifier]||(specifier.startsWith("@/components/") && specifier !== "@/components/cart/cart-line")||specifier==='next/link'){
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

const {products: historical}=require(load('tests/fixtures/products.ts'));
const {normalizeProductId}=require(load('src/lib/products/identity.ts'));
const {productRowToProduct}=require(load('src/lib/products/adapter.ts'));
const {reconcileCart,reconcileWishlist}=require(load('src/store/reconcile-persisted-items.ts'));
const {selectCart,selectWishlist,availableSubtotal}=require(load('src/lib/products/selection.ts'));
const {CartContents}=require(load('src/components/cart/cart-contents.tsx'));
const {WishlistContents}=require(load('src/components/wishlist/wishlist-contents.tsx'));
const id=normalizeProductId('jersey-001');
const future='12345678-1234-4234-8234-123456789abc';
const image=id+'/main-dev-v1.webp';
const p=historical[0];
const row={id,name:'Current Nigeria jersey',slug:p.slug,description:p.description,price_kobo:3300000,original_price_kobo:3600000,image_path:image,images:[],club:null,league:null,country:'Nigeria',category:'home',season:p.season,sizes:['M','L'],is_new:true,is_featured:true,is_best_seller:true,in_stock:true,is_active:true,currency:'NGN'};
const current=productRowToProduct(row);
const selection={productId:id,selectedSize:'M',quantity:2};
const poison={...selection,image:'https://evil.invalid/image.webp',price:1,name:'STALE NAME',slug:'../bad',stock:true,sizes:['BAD']};
function reset(items=[poison],wish=[id]) {
 globalThis.__selectionTest={hydrated:true,cart:{items:reconcileCart({items}),clearCart(){},removeItem(){},updateQuantity(){}},wishlist:{items:reconcileWishlist({items:wish}),clearWishlist(){},removeItem(){}}};
}
function elements(tree) {
 if(!tree||typeof tree!=='object')return [];
 if(typeof tree.type==='function')return elements(tree.type(tree.props));
 return [tree,...[tree.props?.children].flat(Infinity).flatMap(elements)];
}
function text(tree){return JSON.stringify(tree);}

test('cart join uses current adapter metadata and owned Nigeria image, never saved metadata',()=>{
 reset();const items=globalThis.__selectionTest.cart.items;const before=structuredClone(items);
 const lines=selectCart(items,[current]);assert.equal(lines[0].product,current);assert.equal(availableSubtotal(lines),66000);
 const tree=elements(CartContents({products:[current]}));
 const rendered=tree.find(e=>e.type==='ProductImage');assert.equal(rendered.props.reference,image);assert.equal(rendered.props.productId,id);
 assert(!text(tree).includes('evil.invalid'));assert(!text(tree).includes('STALE NAME'));assert(text(tree).includes('66,000'));
 assert.deepEqual(items,before);
});

test('wishlist passes canonical current Nigeria image and price to reusable grid',()=>{
 reset();const tree=elements(WishlistContents({products:[current]}));
 const saved=tree.find(e=>e.type==='ProductGrid').props.products;
 assert.deepEqual(saved,[current]);assert.equal(saved[0].image,image);assert.equal(saved[0].id,id);assert.equal(saved[0].price,33000);
});

test('unknown UUIDs remain removable without fabricated image, link or price',()=>{
 reset([{...selection,productId:future}],[future]);
 const lines=selectCart(globalThis.__selectionTest.cart.items,[current]);assert.equal(lines[0].status,'missing');assert.equal(availableSubtotal(lines),0);
 const tree=elements(CartContents({products:[current]}));assert(!tree.some(e=>e.type==='ProductImage'));assert(!text(tree).includes('/product/'));
 assert(tree.some(e=>e.type==='button'&&e.props.children==='Remove'));assert(!text(tree).includes('/checkout'));
 assert.equal(globalThis.__selectionTest.cart.items.length,1);
 const wish=elements(WishlistContents({products:[current]}));assert(!wish.some(e=>e.type==='ProductGrid'));assert(text(wish).includes('no longer available'));
 assert.deepEqual(selectWishlist([future],[current]).unavailableIds,[future]);
});

test('size/stock changes preserve lines and current metadata but block increments/proceed',()=>{
 for(const product of [{...current,sizes:['L']},{...current,inStock:false}]) {
  reset();const lines=selectCart(globalThis.__selectionTest.cart.items,[product]);
  assert.equal(lines[0].status,product.inStock?'size-unavailable':'out-of-stock');assert.equal(availableSubtotal(lines),0);
  const tree=elements(CartContents({products:[product]}));
  assert.equal(tree.find(e=>e.type==='ProductImage').props.reference,image);
  assert.equal(tree.find(e=>e.props?.['aria-label']?.startsWith('Increase quantity')).props.disabled,true);
  assert(!text(tree).includes('/checkout'));assert.deepEqual(globalThis.__selectionTest.cart.items,[selection]);
 }
});

test('failed catalogue keeps selections, hides totals/metadata and offers retry; empty is distinct',()=>{
 reset();const before=structuredClone(globalThis.__selectionTest.cart.items);
 const tree=elements(CartContents({products:null}));assert(tree.some(e=>e.type==='CatalogueRetry'));
 assert(!tree.some(e=>e.type==='ProductImage'));assert(!text(tree).includes('Subtotal'));assert(!text(tree).includes('subtotal'));
 assert.deepEqual(globalThis.__selectionTest.cart.items,before);
 const wish=elements(WishlistContents({products:null}));assert(wish.some(e=>e.type==='CatalogueRetry'));assert(!wish.some(e=>e.type==='ProductGrid'));assert.deepEqual(globalThis.__selectionTest.wishlist.items,[id]);
 assert(!elements(CartContents({products:[]})).some(e=>e.type==='CatalogueRetry'));
 reset([],[]);assert(text(CartContents({products:[]})).includes('Your cart is empty'));assert(text(WishlistContents({products:[]})).includes('Your wishlist is empty'));
 globalThis.__selectionTest.hydrated=false;assert(text(CartContents({products:[current]})).includes('Loading your cart'));assert(text(WishlistContents({products:[current]})).includes('Loading your wishlist'));
});

test('future catalogue UUID renders normally without extending legacy mapping',()=>{
 const product={...current,id:future,image:'/products/placeholder.svg'};
 assert.equal(selectCart([{...selection,productId:future}],[product])[0].status,'available');
 assert.deepEqual(selectWishlist([future],[product]).products,[product]);
});

test('production has no static catalogue imports or metadata identity map',()=>{
 function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
 assert(!existsSync(join(root,'src/data/products.ts')));
 for(const file of files(join(root,'src')).filter(p=>/\.tsx?$/.test(p))) {
  const source=readFileSync(file,'utf8');
  assert(!/(?:from\s*|import\s*\(|require\s*\()["'][^"']*(?:data\/products|fixtures\/products|tests\/)/.test(source),file);
 }
 const identity=readFileSync(join(root,'src/lib/products/identity.ts'),'utf8');
 assert(!/resolveProduct|canonicalProducts|\bimport\b/.test(identity));
});

test("printing adds 5000 per personalized jersey and excludes unavailable lines",()=>{const p={price:32000};const item={quantity:2,personalization:{name:"AYO",number:"10"}};assert.equal(availableSubtotal([{item,product:p,status:"available"}]),74000);assert.equal(availableSubtotal([{item:{quantity:1},product:p,status:"available"},{item,product:p,status:"available"}]),106000);assert.equal(availableSubtotal([{item,product:p,status:"out-of-stock"}]),0);assert.equal(availableSubtotal([{item,product:p,status:"unverified"}]),0);});

const {deliveryFee}=require(load('src/lib/delivery.ts'));
test("delivery uses approved flat rates and rejects unknown destinations",()=>{assert.equal(deliveryFee('osun'),2000);assert.equal(deliveryFee('other-nigeria'),5000);for(const zone of ['', 'international', 'lagos', '__proto__'])assert.equal(deliveryFee(zone),null);const subtotal=availableSubtotal([{item:{quantity:2,personalization:{name:'AYO',number:'10'}},product:{price:32000},status:'available'}]);assert.equal(subtotal+deliveryFee('osun'),76000);assert.equal(subtotal+deliveryFee('other-nigeria'),79000);});

const {stateDeliveryFee,NIGERIAN_STATES}=require(load('src/lib/delivery.ts'));
test("state-based delivery accepts 36 states and FCT and rejects unknown input",()=>{assert.equal(new Set(NIGERIAN_STATES).size,37);assert.equal(stateDeliveryFee('Osun'),2000);for(const state of NIGERIAN_STATES.filter(s=>s!=='Osun'))assert.equal(stateDeliveryFee(state),5000);assert.equal(stateDeliveryFee(''),null);assert.equal(stateDeliveryFee('London'),null);});
