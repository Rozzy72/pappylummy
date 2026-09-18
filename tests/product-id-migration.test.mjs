// Run directly to avoid Windows test-runner subprocess restrictions.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const temp = mkdtempSync(join(tmpdir(), "jersey-id-tests-"));
const compiled = new Map();
function load(path) {
  const absolute = resolve(root, path);
  if (compiled.has(absolute)) return compiled.get(absolute);
  const output = join(temp, compiled.size + ".cjs");
  compiled.set(absolute, output);
  const result = ts.transpileModule(readFileSync(absolute, "utf8"), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText.replace(/require\("([^"\n]+)"\)/g, (_, specifier) => {
    const dependency = specifier.startsWith("@/") ? load("src/" + specifier.slice(2) + ".ts")
      : specifier.startsWith(".") ? load(resolve(dirname(absolute), specifier + ".ts"))
      : require.resolve(specifier);
    return "require(" + JSON.stringify(dependency) + ")";
  });
  writeFileSync(output, result);
  return output;
}
const storage = new Map();
globalThis.window = {localStorage: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
}};
after(() => { delete globalThis.window; rmSync(temp, {recursive: true, force: true}); });
const { normalizeProductId: normalize } = require(load("src/lib/products/identity.ts"));
const { reconcileCart: cart, reconcileWishlist: wishlist } = require(load("src/store/reconcile-persisted-items.ts"));
const { useCartStore: cs, hydrateCart, selectTotalItems } = require(load("src/store/cart-store.ts"));
const { useWishlistStore: ws, hydrateWishlist } = require(load("src/store/wishlist-store.ts"));

const id = "423bb850-23f3-493f-a3c1-5b03c2096f93";
const future = "12345678-1234-4234-8234-123456789abc";
const line = (productId = "jersey-001", selectedSize = "M", quantity = 1) => ({productId, selectedSize, quantity});
const product = {id, inStock:true, sizes:["M", "L"]};
const {migrateCart, migrateWishlist} = require(load("src/store/reconcile-persisted-items.ts"));

test("all reviewed legacy mappings match seed UUIDs; future UUIDs are candidates", () => {
  const seed=readFileSync(join(root,"supabase/seeds/001_products.sql"),"utf8");
  const pairs=[...seed.matchAll(/-- (jersey-\d{3})\s*\(\s*'([^']+)'/g)];
  assert.equal(pairs.length,12);
  for(const [,legacy,uuid] of pairs) { assert.equal(normalize(legacy),uuid); assert.equal(normalize(uuid),uuid); }
  assert.equal(normalize('jersey-001'),id);assert.equal(normalize(future),future);
  for(const bad of [null,{},[],1,'jersey-999','../bad','https://evil.invalid',' '+id,id+'?x=1'])assert.equal(normalize(bad),undefined);
});

test("structural reconciliation rejects malformed sizes/quantities, not availability", () => {
  for(const bad of [null,[],{}, {items:{}}]) { assert.deepEqual(cart(bad),[]);assert.deepEqual(wishlist(bad),[]); }
  for(const quantity of [0,-1,11,NaN,Infinity,1.5,'2',null])assert.deepEqual(cart({items:[line(id,'M',quantity)]}),[]);
  assert.deepEqual(cart({items:[line(id,'BAD')]}),[]);
  assert.deepEqual(cart({items:[line(future)]}),[line(future)]);
  assert.equal(cart({items:[line('jersey-009')]}).length,1);
});

test("metadata discarded; duplicates capped, separate sizes retained, input immutable", () => {
  const saved={items:[{...line(),image:'https://evil.invalid/x',price:1,name:'Fake',slug:'../x',stock:true,sizes:['BAD']},line(id,'M',10),line(id,'L',2)]};
  const before=structuredClone(saved);const result=cart(saved);
  assert.deepEqual(result,[line(id,'M',10),line(id,'L',2)]);assert.deepEqual(saved,before);
  assert.deepEqual(cart({items:result}),result);
});

test("v1/v2 migration strips metadata; unsupported versions rejected", () => {
  for(const version of [1,2]) {
    assert.deepEqual(migrateCart({items:[{...line(),image:'stale',price:0}]},version),{items:[line(id)]});
    assert.deepEqual(migrateWishlist({items:['jersey-001',id,future,null,'bad']},version),{items:[id,future]});
  }
  for(const version of [0,4,99,-1,undefined,'2']) {
    assert.deepEqual(migrateCart({items:[line()]},version),{items:[]});
    assert.deepEqual(migrateWishlist({items:[id]},version),{items:[]});
  }
});

test("actual v1/v2/v3 storage hydration and reload preserve selections only", async () => {
  await hydrateCart();await hydrateWishlist();
  for(const version of [1,2,3]) {
    storage.set('naija-kits-cart',JSON.stringify({version,state:{items:[{...line(),image:'https://evil.invalid',price:0}]}}));
    storage.set('naija-kits-wishlist',JSON.stringify({version,state:{items:['jersey-001',id,future]}}));
    await cs.persist.rehydrate();await ws.persist.rehydrate();
    assert.deepEqual(cs.getState().items,[line(id)]);assert.deepEqual(ws.getState().items,[id,future]);
    cs.getState().updateQuantity(id,'M',2);
    const payload=JSON.parse(storage.get('naija-kits-cart'));
    assert.equal(payload.version,3);assert.deepEqual(payload.state,{items:[line(id,'M',2)]});
    await cs.persist.rehydrate();assert.deepEqual(cs.getState().items,[line(id,'M',2)]);
  }
});

test("cart actions use transient current product, enforce bounds and never persist it", () => {
  cs.getState().clearCart();
  assert.equal(cs.getState().addItem(product,'M',1),true);
  assert.equal(cs.getState().addItem(product,'M',2),true);
  assert.equal(cs.getState().addItem(product,'L',1),true);
  assert.equal(selectTotalItems(cs.getState()),4);
  assert.equal(cs.getState().addItem({...product,inStock:false},'M',1),false);
  assert.equal(cs.getState().addItem(product,'XL',1),false);
  assert.equal(cs.getState().addItem(product,'M',8),false);
  for(const quantity of [0,-1,11,NaN,Infinity,1.5]) {cs.getState().updateQuantity(id,'M',quantity);assert.equal(cs.getState().items[0].quantity,3);}
  cs.getState().updateQuantity(id,'M',10);assert.equal(cs.getState().items[0].quantity,10);
  cs.getState().removeItem('jersey-001','M');assert.deepEqual(cs.getState().items,[line(id,'L',1)]);
  cs.getState().clearCart();assert.deepEqual(cs.getState().items,[]);
});

test("wishlist deduplication, future candidate, toggle, remove, clear", () => {
  ws.getState().clearWishlist();ws.getState().addItem('jersey-001');ws.getState().addItem(id);
  assert.equal(ws.getState().totalWishlistItems(),1);ws.getState().toggleItem(id);assert.deepEqual(ws.getState().items,[]);
  ws.getState().addItem(future);ws.getState().addItem('bad');assert.deepEqual(ws.getState().items,[future]);
  ws.getState().removeItem(future);assert.deepEqual(ws.getState().items,[]);
  ws.getState().addItem(id);ws.getState().clearWishlist();assert.deepEqual(ws.getState().items,[]);
});

test("malformed JSON, same-version tampering and future versions fail safely", async () => {
  cs.getState().clearCart();ws.getState().clearWishlist();
  for(const key of ['naija-kits-cart','naija-kits-wishlist'])storage.set(key,'{broken');
  await cs.persist.rehydrate();await ws.persist.rehydrate();assert.deepEqual(cs.getState().items,[]);assert.deepEqual(ws.getState().items,[]);
  for(const key of ['naija-kits-cart','naija-kits-wishlist'])storage.set(key,JSON.stringify({version:99,state:{items:key.endsWith('cart')?[line(id)]:[id]}}));
  await cs.persist.rehydrate();await ws.persist.rehydrate();assert.deepEqual(cs.getState().items,[]);assert.deepEqual(ws.getState().items,[]);
  assert(cs.getState().hydrated);assert(ws.getState().hydrated);
});


test("storage envelope rejects missing/nonnumeric/future versions before Zustand merge", async () => {
  cs.getState().clearCart();ws.getState().clearWishlist();
  for(const version of [undefined,'3','99',null,0,99]) {
    storage.set('naija-kits-cart',JSON.stringify({version,state:{items:[line(id)]}}));
    storage.set('naija-kits-wishlist',JSON.stringify({version,state:{items:[id]}}));
    await cs.persist.rehydrate();await ws.persist.rehydrate();
    assert.deepEqual(cs.getState().items,[]);assert.deepEqual(ws.getState().items,[]);
  }
});
