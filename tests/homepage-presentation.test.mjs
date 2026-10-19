import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { resolve, dirname } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { loadUi } from "./ui-loader.mjs";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const ui = loadUi();
// Offline presentation fixture only: never instantiate a Supabase client.
export function presentationHarness(authenticated = false, query = "") {
  let queries = 0;
  const mocks = {
    "@sd/ui": ui,
    "next/navigation": { useSearchParams: () => new URLSearchParams(query), usePathname: () => "/shop" },
    "@/lib/auth/header-auth": { isHeaderAuthenticated: async () => authenticated },
    "@/components/auth/sign-out-form": { SignOutForm: () => h("button", {type:"button"}, "Sign out") },
    "@/components/cart/cart-link": { CartLink: () => h(ui.NavLink, {href:"/cart"}, "Cart (1)") },
    "@/components/wishlist/wishlist-link": { WishlistLink: () => h(ui.NavLink, {href:"/wishlist"}, "Wishlist (1)") },
    "@/components/product/product-image": { ProductImage: ({alt}) => h("img", {src:"/products/placeholder.svg", alt, loading:"lazy"}) },
    "@/components/product/wishlist-button": { WishlistButton: ({productName}) => h(ui.IconButton, {"aria-label":`Save ${productName} to wishlist`, "aria-pressed":false, variant:"secondary"}, h(ui.Icon,{name:"heart"})) },
    "next/link": { default: ({children, ...props}) => h("a", props, children) },
    "next/image": { default: ({children, ...props}) => h("img", props, children) },
  };
  const cache = new Map();
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path);
    const compiledModule = new Module(path);
    compiledModule.require = (name) => {
      if (mocks[name]) return mocks[name];
      if (name === "./product-image") return mocks["@/components/product/product-image"];
      if (name === "./wishlist-button") return mocks["@/components/product/wishlist-button"];
      if (name.startsWith("@/lib/supabase")) throw Error("No live clients in presentation tests");
      if (name.startsWith("@/") || name.startsWith(".")) {
        const base = name.startsWith("@/") ? resolve(root,"src",name.slice(2)) : resolve(dirname(path),name);
        return load(base + (existsSync(base+".ts") ? ".ts" : ".tsx"));
      }
      return require(name);
    };
    compiledModule._compile(ts.transpileModule(readFileSync(path,"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,path);
    cache.set(path,compiledModule.exports);
    return compiledModule.exports;
  }
  const products = load("tests/fixtures/products.ts").products;
  mocks["@/lib/products/queries"] = {getProducts:async()=>{queries++;return products;}};
  return {load, products, queries:()=>queries};
}
test("homepage orders the approved hero, New Arrivals and football discovery", () => {
  const harness = presentationHarness();
  const page = harness.load("src/app/page.tsx").default();
  assert.equal(page.type, ui.PageFrame);
  assert.equal(page.props.width,"full-bleed");
  assert.equal(page.props.children.length,4);
  assert.equal(page.props.children[0].type.name,"Hero");
  assert.equal(page.props.children[1].type.name,"FootballDiscovery");
  assert.equal(page.props.children[2].type.name,"NewArrivals");
  assert.equal(page.props.children[3].type.name,"MakeItYours");
  assert(existsSync(resolve(root,"src/app/customize/page.tsx")));
});

test("The Edit excludes New Arrivals, prioritizes editorial flags and never mutates products", () => {
  const {load,products}=presentationHarness();
  const {selectEditorialProducts}=load("src/components/home/the-edit.tsx");
  const before=JSON.stringify(products);
  const selected=selectEditorialProducts(products);
  const arrivalIds=new Set(products.filter(p=>p.isNew).slice(0,4).map(p=>p.id));
  assert.equal(selected.length,3);
  assert(selected.every(p=>products.includes(p) && !arrivalIds.has(p.id)));
  assert.equal(JSON.stringify(products),before);
  assert.deepEqual(selectEditorialProducts([]),[]);
  assert.deepEqual(selectEditorialProducts(products.filter(p=>arrivalIds.has(p.id))),[]);
  const remaining=products.filter(p=>!arrivalIds.has(p.id));
  const custom=remaining.map((p,i)=>({...p,isFeatured:i===remaining.length-1,isNew:false}));
  assert.equal(selectEditorialProducts(custom)[0],custom.at(-1));
  assert.equal(selectEditorialProducts([custom[0]]).length,1);
});

test("The Edit keeps actual reusable card links, pricing, stock and wishlist semantics", async () => {
  const harness=presentationHarness();
  const editorial=harness.load("src/components/home/the-edit.tsx");
  const markup=renderToStaticMarkup(await editorial.TheEdit());
  assert.equal(harness.queries(),1);
  assert.match(markup,/THE EDIT/);
  assert.equal((markup.match(/role="listitem"/g)||[]).length,3);
  assert.equal((markup.match(/aria-label="Save [^"]+ to wishlist"/g)||[]).length,3);
  assert.equal((markup.match(/Current price:/g)||[]).length,3);
  assert.equal((markup.match(/loading="lazy"/g)||[]).length,3);
  for(const p of editorial.selectEditorialProducts(harness.products)) {
    assert(markup.includes(`/product/${p.slug}`));
    assert(markup.includes(p.name));
    if (!p.inStock) assert.match(markup,/Currently out of stock/);
  }
  assert.doesNotMatch(markup,/best.?seller|popular|fan favourites|ratings/i);
});

test("Make It Yours uses approved lazy imagery and only the existing customization destination", () => {
  const {load}=presentationHarness();
  const markup=renderToStaticMarkup(h(load("src/components/home/make-it-yours.tsx").MakeItYours));
  assert.match(markup,/MAKE IT YOURS/);
  assert.match(markup,/href="\/customize"/);
  assert.equal((markup.match(/<a /g)||[]).length,1);
  assert.match(markup,/pappylummy-banner-v2/);
  assert.match(markup,/aria-hidden="true"/);
  assert.match(markup,/width="2164" height="727"/);
  assert.match(markup,/Illustrative lettering preview. Checkout is not yet available./);
  assert.doesNotMatch(markup,/fetchPriority|free|guarantee|delivery|returns|₦/i);
});

test("team discovery selects only catalogue-backed teams and encodes existing club filters", () => {
  const {load,products}=presentationHarness();
  const {selectTeamFeatures}=load("src/components/home/football-discovery.tsx");
  const features=selectTeamFeatures(products);
  assert.deepEqual(features.map(x=>x.team),["Nigeria","Arsenal","Chelsea","Barcelona","Real Madrid"]);
  for (const feature of features) {
    assert(products.includes(feature.product));
    assert.equal(new URL(feature.href,"https://example.test").searchParams.get("club"),feature.team);
    assert.equal(feature.product.club ?? feature.product.country,feature.team);
  }
  assert.equal(features.at(-1).href,"/shop?club=Real%20Madrid");
  assert.deepEqual(selectTeamFeatures([]),[]);
  assert.deepEqual(selectTeamFeatures(products.filter(p=>(p.club ?? p.country)==="Arsenal")).map(x=>x.team),["Arsenal"]);
});

test("reference discovery uses one catalogue read and real team/category destinations", async () => {
 const harness=presentationHarness();
 const tree=await harness.load("src/components/home/football-discovery.tsx").FootballDiscovery();
 assert.equal(harness.queries(),1);
 const markup=renderToStaticMarkup(tree);
 assert.match(markup,/Shop by Club/);assert.match(markup,/Shop by Category/);
 assert.equal((markup.match(/<h2 /g)||[]).length,2);
 for(const href of ['/clubs','/shop?teamType=national','/shop?category=retro','/customize'])assert(markup.includes('href="'+href+'"'));
 assert.doesNotMatch(markup,/fetchPriority|role="listitem"|Add to cart|ratings|authentic/i);
});

test("Nigeria editorial uses existing home product and truthful fixed destination", () => {
  const {load,products}=presentationHarness();
  const {NigeriaEditorial,ShopByTeam}=load("src/components/home/football-discovery.tsx");
  const markup=renderToStaticMarkup(h(NigeriaEditorial,{products}));
  const home=products.find(p=>p.country==="Nigeria" && p.category==="home");
  assert(home);
  assert(markup.includes(home.name));
  assert.match(markup,/href="\/shop\?club=Nigeria"/);
  assert.match(markup,/WEAR<br\/>THE <span>GREEN\.<\/span>/);
  assert.doesNotMatch(markup,/official|licensed|authentic|endorse/i);
  assert.equal(renderToStaticMarkup(h(NigeriaEditorial,{products:[]})),"");
  assert.equal(renderToStaticMarkup(h(ShopByTeam,{products:[]})),"");
});
test("hero uses one local dimensioned priority image and honest existing CTAs", () => {
  const {load} = presentationHarness();
  const markup = renderToStaticMarkup(h(load("src/components/home/hero.tsx").Hero));
  assert.match(markup,/YOUR TEAM\.<br\/>YOUR COLOURS\.<br\/><span>YOUR IDENTITY\.<\/span>/);
  assert.equal((markup.match(/<img /g)||[]).length,1);
  assert.match(markup,/width="1983" height="793"/);
  assert.match(markup,/pappylummy-hero-v2/);
  assert.match(markup,/href="\/shop"/);
  assert.match(markup,/href="\/customize"/);
  assert.doesNotMatch(markup,/#kit-lab|video|carousel|free delivery/i);
});
for (const authenticated of [false,true]) test(`header presentation preserves ${authenticated ? "authenticated" : "anonymous"} destinations`, async () => {
  const {load} = presentationHarness(authenticated);
  const markup=renderToStaticMarkup(await load("src/components/layout/header.tsx").Header());
  for (const label of ["Shop","Clubs","National Teams","Retro","Customize","New In"]) assert(markup.includes(label));
  assert.match(markup,/href="\/#new-arrivals"/);
  assert.match(markup,/Cart \(1\)/);
  assert.match(markup,/Wishlist \(1\)/);
  assert.equal(markup.includes('href="/account"'),authenticated);
  assert.equal(markup.includes('href="/login"'),!authenticated);
  assert.equal(markup.includes('Sign out'),authenticated);
  assert.match(markup,/aria-expanded="false"/);
  assert.match(markup,/id="mobile-navigation".*hidden=""/);
});
test("Featured jerseys use five live catalogue products and trusted reusable cards", async () => {
  const harness=presentationHarness();
  const markup=renderToStaticMarkup(await harness.load("src/components/home/new-arrivals.tsx").NewArrivals());
  assert.equal(harness.queries(),1);
  assert.match(markup,/id="new-arrivals"/);
  assert.match(markup,/Top picks from our collection/);
  assert.match(markup,/Featured Jerseys/);
  assert.equal((markup.match(/role="listitem"/g)||[]).length,5);
  assert.equal((markup.match(/aria-label="Save [^"]+ to wishlist"/g)||[]).length,5);
  assert.equal((markup.match(/loading="lazy"/g)||[]).length,5);
});
test("cards retain unavailable and sale information without season metadata clutter", () => {
  const harness=presentationHarness();
  const Card=harness.load("src/components/product/product-card.tsx").ProductCard;
  const markup=renderToStaticMarkup(h(Card,{product:{...harness.products[0],inStock:false,price:25000,originalPrice:30000}}));
  assert.match(markup,/Currently out of stock/);
  assert.match(markup,/Original price:/);
  assert.match(markup,/Sale/);
  assert.doesNotMatch(markup,/Select your size/);
});

test('benefits describe supported browsing, personalisation and local wishlist capabilities',()=>{
 const {load}=presentationHarness();
 const markup=renderToStaticMarkup(h(load('src/components/home/store-benefits.tsx').StoreBenefits));
 for(const route of ['/shop','/customize','/wishlist']) assert(markup.includes(`href="${route}"`));
 assert.match(markup,/on this browser/);
 assert.equal((markup.match(/<h3/g)||[]).length,3);
 assert.doesNotMatch(markup,/free delivery|authentic|guarantee|secure payment|same.day|licensed/i);
});
test('community is an editorial statement without collection forms or invented destinations',()=>{
 const {load}=presentationHarness();
 const markup=renderToStaticMarkup(h(load('src/components/home/football-community.tsx').FootballCommunity));
 assert.match(markup,/06 \/ BEYOND THE PITCH/);
 assert.match(markup,/MORE THAN<br\/>A GAME\./);
 assert.doesNotMatch(markup,/<form|<input|<a |<img|subscribe|newsletter/i);
});
test('footer has only existing destinations, accessible groups and a single layout mount',()=>{
 const {load}=presentationHarness();
 const markup=renderToStaticMarkup(h(load('src/components/layout/footer.tsx').Footer));
 for(const label of ['Shop','Experience','Information']) assert(markup.includes(`aria-label="Footer ${label}"`));
 const paths=[...markup.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(paths,['/','/shop','/clubs','/shop?teamType=national','/shop?category=retro','/#new-arrivals','/customize','/account','/wishlist','/cart','/guide']);
 for(const href of paths) {const path=href.split(/[?#]/)[0]; assert(existsSync(resolve(root,'src/app',path.slice(1),'page.tsx')));}
 assert.equal((markup.match(/<footer/g)||[]).length,1);
 assert.equal((readFileSync(resolve(root,'src/app/layout.tsx'),'utf8').match(/<Footer\s*\/>/g)||[]).length,1);
 assert.doesNotMatch(readFileSync(resolve(root,'src/app/page.tsx'),'utf8'),/<Footer/);
 assert.match(markup,/Ordering is not available yet/);
});

 test('national URL initializes visible shop results and rejects unsupported values',()=>{
 for(const query of ['teamType=national','teamType=unknown']) {
 const {load,products}=presentationHarness(false,query);
 const markup=renderToStaticMarkup(h(load('src/components/product/shop-catalogue.tsx').ShopCatalogue,{products}));
 assert(markup.includes('/product/nigeria-home'));
 assert.equal(markup.includes('/product/arsenal-home'),query.includes('unknown'));
 }
 });
 test('header and footer agree on dedicated national collection destination',async()=>{
 const {load}=presentationHarness();
 for(const tree of [await load('src/components/layout/header.tsx').Header(),h(load('src/components/layout/footer.tsx').Footer)]){
 const html=renderToStaticMarkup(tree); assert(html.includes('href="/shop?teamType=national"')); assert(!html.includes('/shop?category=international'));
 }
 });

test('editorial identity strip offers real Nigeria, club and studio journeys without commerce claims',()=>{
 const {load}=presentationHarness();const markup=renderToStaticMarkup(h(load('src/components/home/hero.tsx').Hero));
 assert.match(markup,/Choose your fit/);
 for(const route of ['/shop','/customize'])assert(markup.includes('href="'+route+'"'));
 assert.match(markup,/For the match\. For the street\./);
 assert.doesNotMatch(markup,/best.?seller|official|licensed|same.day|countdown/i);
});

test("card size controls expose only live product sizes and start without a selection",()=>{
 const {load,products}=presentationHarness();const Actions=load("src/components/product/product-card-actions.tsx").ProductCardActions;const product={...products[0],sizes:["S","L"],inStock:true};const html=renderToStaticMarkup(h(Actions,{product}));assert.match(html,/Add to Cart/);assert.match(html,/Size for/);assert.equal((html.match(/aria-pressed="false"/g)||[]).length,2);assert.doesNotMatch(html,/aria-pressed="true"/);assert.match(html,/>Add to Cart<\/button>/);assert.match(html,/<button[^>]*disabled=""[^>]*>Add to Cart/);
});
test("out-of-stock cards cannot select a size or add to cart",()=>{const {load,products}=presentationHarness();const html=renderToStaticMarkup(h(load("src/components/product/product-card-actions.tsx").ProductCardActions,{product:{...products[0],inStock:false}}));assert.match(html,/<fieldset disabled=""/);assert.match(html,/Out of stock/);});
