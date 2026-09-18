// Run: node tests/product-adapter.test.mjs (no database or environment needed).
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const temp = mkdtempSync(join(tmpdir(), "jersey-adapter-test-"));
after(() => rmSync(temp, { recursive: true, force: true }));
async function load(relative, name) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace("@/utils/product-image", "./product-image.mjs");
  const path = join(temp, name + ".mjs");
  writeFileSync(path, output);
  return import(pathToFileURL(path).href);
}
await load("../src/utils/product-image.ts", "product-image");
const { productRowToProduct: adapt, koboToNaira, isProductSlug } = await load("../src/lib/products/adapter.ts", "adapter");
const { products } = await load("./fixtures/products.ts", "products");
const seed = readFileSync(new URL("../supabase/seeds/001_products.sql", import.meta.url), "utf8");
const columns = seed.match(/INSERT INTO public.products \(\s*([\s\S]*?)\) VALUES/)[1].split(",").map(s => s.trim());
function parse(value) {
  if (value === "NULL") return null;
  if (value === "true" || value === "false") return value === "true";
  if (value.startsWith("ARRAY[")) return [...value.matchAll(/'((?:[^']|'')*)'/g)].map(m => m[1].replace(/''/g, "'"));
  if (value.startsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return Number(value);
}
const rows = [...seed.matchAll(/-- (jersey-\d{3})\n\(\n([\s\S]*?)\n\)/g)].map(m => {
  const values = m[2].split("\n").map(line => parse(line.trim().replace(/,$/, "")));
  return { legacyId: m[1], row: Object.fromEntries(columns.map((column, i) => [column, values[i]])) };
});
const row = rows[0].row;

test("all 12 seed rows map every field to the actual catalogue with UUID IDs", () => {
  assert.equal(rows.length, 12);
  for (const {legacyId, row} of rows) {
    const original = products.find(p => p.id === legacyId);
    const result = adapt(row);
    assert.equal(result.id, row.id);
    for (const key of Object.keys(result)) if (key !== "id") assert.deepEqual(result[key], original[key], key);
  }
});
test("money and nullable optional fields", () => {
  assert.equal(koboToNaira(3000000), 30000);
  assert.equal(koboToNaira(0), 0);
  assert.equal(koboToNaira(101), 1.01);
  const result = adapt({...row, original_price_kobo: null, club: null, league: null, country: null});
  for (const field of ["originalPrice", "club", "league", "country"]) assert.equal(result[field], undefined);
  assert.equal(adapt(row).originalPrice, 36000);
});
test("invalid monetary values and discount relationships fail", () => {
  for (const value of [-1, NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1, "30000", undefined, null]) {
    assert.throws(() => adapt({...row, price_kobo: value}));
    if (value !== null) assert.throws(() => adapt({...row, original_price_kobo: value}));
  }
  assert.throws(() => adapt({...row, original_price_kobo: row.price_kobo}));
});
test("categories and every size validated without casts", () => {
  for (const category of ["home", "away", "third", "goalkeeper", "training", "retro", "player", "international"]) assert.equal(adapt({...row, category}).category, category);
  for (const category of ["bad", "toString", "__proto__", null]) assert.throws(() => adapt({...row, category}));
  assert.deepEqual(adapt({...row, sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"]}).sizes, ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"]);
  for (const sizes of [["M", "bad"], [null], null, "M"]) assert.throws(() => adapt({...row, sizes}));
});
test("local paths only, including additional images; null primary uses placeholder", () => {
  assert.equal(adapt({...row, image_path: null}).image, "/products/placeholder.svg");
  for (const path of ["https://example.com/a.jpg", "//example.com/a.jpg", "/products/../a.jpg", "/products/%2e%2e.jpg", "/products/a.jpg?x=1", "", "javascript:alert(1)"]) {
    assert.equal(adapt({...row, image_path: path}).image, "/products/placeholder.svg");
    assert.deepEqual(adapt({...row, images: [path]}).images, []);
  }
  assert.deepEqual(adapt({...row, images: null}).images, []);
});
test("arrays are copied and input is not mutated", () => {
  const input = {...row, sizes: Object.freeze(["M"]), images: Object.freeze(["/products/placeholder.svg"])};
  const result = adapt(Object.freeze(input));
  result.sizes.push("L"); result.images.push("/products/other.jpg");
  assert.deepEqual(input.sizes, ["M"]); assert.equal(input.images.length, 1);
});
test("unsafe slugs and unsupported currency rejected", () => {
  assert.equal(isProductSlug("arsenal-home"), true);
  for (const slug of ["../x", "x?y=1", "", null]) assert.equal(isProductSlug(slug), false);
  assert.throws(() => adapt({...row, slug: "../x"}));
  assert.throws(() => adapt({...row, currency: "USD"}));
});

test("adapter preserves owned Storage references and safely filters gallery", () => {
  const main = row.id + "/main-dev-v1.webp";
  const valid = row.id + "/front-v2.webp";
  const foreign = "698ac8ab-fc88-4dd8-a403-23c0fb13af7d/main-v1.webp";
  const result = adapt({...row, image_path: main, images: [main, foreign, null, valid, valid]});
  assert.equal(result.image, main);
  assert.deepEqual(result.images, [valid]);
  assert.equal(adapt({...row, image_path: foreign}).image, "/products/placeholder.svg");
});
