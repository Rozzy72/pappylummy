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
const line = (productId = "jersey-001", selectedSize = "XL", quantity = 1) => ({productId, selectedSize, quantity});

test("all reviewed mappings resolve; unknown and malformed identities are rejected", () => {
  const doc = readFileSync(join(root,"docs/product-seed.md"),"utf8");
  const pairs = [...doc.matchAll(/\| (jersey-\d{3}) \| ([0-9a-f-]{36}) \|/g)];
  assert.equal(pairs.length,12);
  for (const [,legacy,uuid] of pairs) {assert.equal(normalize(legacy),uuid); assert.equal(normalize(uuid),uuid);}
  for (const bad of ["jersey-999", "00000000-0000-4000-8000-000000000000", "__proto__", null, {}, 3]) assert.equal(normalize(bad),undefined);
});
test("malformed shapes, invalid sizes and quantities are discarded", () => {
  for (const bad of [null, undefined, [], "bad", 5, {}, {items:null}, {items:{}}]) {assert.deepEqual(cart(bad),[]);assert.deepEqual(wishlist(bad),[]);}
  for (const quantity of [0,-1,11,NaN,Infinity,1.5,"2",null]) assert.deepEqual(cart({items:[line("jersey-001","XL",quantity)]}),[]);
  for (const item of [null,{},line("jersey-999"),line("jersey-001","BAD"),line("jersey-009","M")]) assert.deepEqual(cart({items:[item]}),[]);
});
test("duplicate identities merge at max 10; different sizes remain separate; idempotent", () => {
  const result=cart({items:[line("jersey-001","XL",4),line(id,"XL",8),line(id,"M",2)]});
  assert.equal(result.length,2);assert.equal(result[0].quantity,10);assert.equal(result[0].productId,id);
  assert.equal(result[1].quantity,2);assert.deepEqual(cart({items:result}),result);
});
test("persisted metadata is ignored and input remains unchanged", () => {
  const fake={...line(),price:1,name:"Fake",image:"https://evil.invalid/x",slug:"../x",inStock:true};
  const snapshot=structuredClone(fake);const result=cart({items:[fake]})[0];
  assert.equal(result.price,32000);assert.equal(result.name,"Nigeria Green Home Fan Jersey");assert.equal(result.image,"/products/placeholder.svg");assert.equal(result.slug,"nigeria-home");assert.deepEqual(fake,snapshot);
});
test("wishlist canonicalizes, deduplicates, rejects unknown IDs and is idempotent", () => {
  const result=wishlist({items:["jersey-001",id,null,{},"jersey-999","00000000-0000-4000-8000-000000000000","jersey-002"]});
  assert.deepEqual(result,[id,normalize("jersey-002")]);assert.deepEqual(wishlist({items:result}),result);
});
test("actual version-1 storage hydrates into version 2 and persists canonical IDs", async () => {
  storage.set("naija-kits-cart",JSON.stringify({version:1,state:{items:[line()]}}));
  storage.set("naija-kits-wishlist",JSON.stringify({version:1,state:{items:["jersey-001"]}}));
  await hydrateCart();await hydrateWishlist();
  assert.equal(cs.getState().hydrated,true);assert.equal(ws.getState().hydrated,true);
  assert.equal(cs.getState().items[0].productId,id);assert.deepEqual(ws.getState().items,[id]);
  for (const key of ["naija-kits-cart","naija-kits-wishlist"]) assert.equal(JSON.parse(storage.get(key)).version,2);
  const before=structuredClone(cs.getState().items);await cs.persist.rehydrate();assert.deepEqual(cs.getState().items,before);
  await ws.persist.rehydrate();assert.deepEqual(ws.getState().items,[id]);
});
test("legacy static IDs still add/update/remove/toggle and counts stay correct", () => {
  cs.getState().clearCart();ws.getState().clearWishlist();
  assert.equal(cs.getState().addItem("jersey-001","M",1),true);
  assert.equal(cs.getState().addItem(id,"M",2),true);
  assert.equal(cs.getState().items.length,1);assert.equal(selectTotalItems(cs.getState()),3);
  cs.getState().updateQuantity("jersey-001","M",4);assert.equal(cs.getState().items[0].quantity,4);
  cs.getState().updateQuantity(id,"M",0);assert.equal(cs.getState().items[0].quantity,4);
  assert.equal(cs.getState().addItem("jersey-001","M",7),false);
  cs.getState().removeItem("jersey-001","M");assert.equal(cs.getState().items.length,0);
  ws.getState().toggleItem("jersey-001");assert.equal(ws.getState().isWishlisted(id),true);assert.equal(ws.getState().isWishlisted("jersey-001"),true);
  assert.equal(ws.getState().totalWishlistItems(),1);ws.getState().toggleItem(id);assert.equal(ws.getState().items.length,0);
  ws.getState().addItem(id);ws.getState().removeItem("jersey-001");assert.equal(ws.getState().items.length,0);
});
test("malformed JSON and same-version tampering cannot break hydration", async () => {
  cs.getState().clearCart();ws.getState().clearWishlist();
  for(const key of ["naija-kits-cart","naija-kits-wishlist"]) storage.set(key,"{broken");
  await cs.persist.rehydrate();await ws.persist.rehydrate();
  assert.equal(cs.getState().hydrated,true);assert.equal(ws.getState().hydrated,true);
  assert.deepEqual(cs.getState().items,[]);assert.deepEqual(ws.getState().items,[]);
  storage.set("naija-kits-cart",JSON.stringify({version:2,state:{items:[{...line(),price:0}]}}));
  await cs.persist.rehydrate();assert.equal(cs.getState().items[0].price,32000);
});
