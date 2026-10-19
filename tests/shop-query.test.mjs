import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { presentationHarness } from './homepage-presentation.test.mjs';

const {load,products}=presentationHarness();
const {readShopQuery,changeShopQuery,shopFilterSummary}=load('src/utils/shop-query.ts');
const {filterAndSortProducts}=load('src/utils/product-catalogue.ts');
const read=q=>readShopQuery(q,products);
const results=q=>{const s=read(q);return s.conflicts.length?[]:filterAndSortProducts(products,s.filters,s.sort);};

test('clear national filters removes stale parameters and preserves sorting across reparse',()=>{
 const initial='teamType=national&sort=price-asc'; assert.equal(results(initial).length,3);
 const cleared=read(changeShopQuery(initial,'clear')).canonical;
 assert.equal(cleared,'sort=price-asc'); assert.equal(results(cleared).length,12);
 assert.deepEqual(read(cleared),read(new URL('https://example.test/shop?'+cleared).search));
});
test('URL history snapshots reproduce controls and results without local state',()=>{
 const history=['','teamType=national','teamType=national&category=retro','teamType=national&category=retro&sort=price-desc'];
 for(const i of [3,2,1,0,1,2,3]) {
  assert.equal(results(history[i]).length,[12,3,1,1][i]);
  assert.equal(read(history[i]).sort,i===3?'price-desc':'featured');
 }
});
test('combined national, club, league and size filters keep intersection semantics',()=>{
 assert.equal(results('teamType=national&category=retro')[0].slug,'nigeria-retro');
 assert.equal(results('teamType=national&club=Arsenal').length,0);
 assert.equal(results('club=Arsenal&league=Premier+League&size=M')[0].slug,'arsenal-home');
 assert(results('size=M').every(p=>p.sizes.includes('M')));
});
test('removing one filter and changing sort preserves other selections',()=>{
 const q=changeShopQuery('teamType=national&category=retro&size=M','category','');
 assert.equal(q,'teamType=national&size=M');
 const sorted=changeShopQuery(q,'sort','price-asc');
 assert.equal(results(sorted).length,3);
 assert.deepEqual(read(sorted).filters,read(q).filters);
});
test('invalid individual values and unsupported parameters retain valid restriction',()=>{
 for(const extra of ['club=Unknown','category=bad','size=bad','league=bad','sort=bad','unrelated=bad']) {
  assert.equal(read('teamType=national&'+extra).canonical,'teamType=national');
  assert.equal(results('teamType=national&'+extra).length,3);
 }
 assert.equal(results('teamType=bad&club=Nigeria').length,2);
});
test('identical duplicates canonicalize but contradictory filters fail closed',()=>{
 assert.equal(read('teamType=national&teamType=national').canonical,'teamType=national');
 for(const q of ['teamType=national&teamType=bad','club=Nigeria&club=Brazil','category=home&category=retro']) {
  assert.equal(read(q).conflicts.length,1); assert.equal(results(q).length,0);
 }
 assert.equal(results('teamType=national&sort=name&sort=bad').length,3);
});
test('a conflicting filter cannot be erased by unrelated selection changes',()=>{
 const q=changeShopQuery('teamType=national&teamType=bad','sort','name');
 assert.equal(results(q).length,0);
 assert.equal(results(changeShopQuery(q,'teamType','national')).length,3);
 assert.equal(results(changeShopQuery(q,'clear')).length,12);
});
test('shareable encoded URL round-trips every supported field',()=>{
 const q='teamType=national&club=Nigeria&category=retro&size=M&sort=name';
 const copied=new URL('/shop?'+read(q).canonical,'https://example.test');
 assert.deepEqual(read(copied.search),read(q));
 assert.equal(results(copied.search)[0].slug,'nigeria-retro');
});
test('active summary is accurate and outside the closed disclosure',()=>{
 const q='teamType=national&category=retro&size=M';
 assert.deepEqual(shopFilterSummary(read(q).filters),['National Teams','Retro','Size M']);
 const harness=presentationHarness(false,q);
 const html=renderToStaticMarkup(h(harness.load('src/components/product/shop-catalogue.tsx').ShopCatalogue,{products}));
 assert(html.indexOf('Active filters (')>html.indexOf('</details>'));
 assert.match(html,/National Teams.*Retro.*Size M/);
 assert.match(html,/group-open:hidden/); assert.match(html,/group-open:inline/);
 assert.match(html,/whitespace-nowrap shrink-0/);
});
test('conflict renders generic recovery alert rather than query contents',()=>{
 const harness=presentationHarness(false,'club=Arsenal&club=untrusted-value');
 const html=renderToStaticMarkup(h(harness.load('src/components/product/shop-catalogue.tsx').ShopCatalogue,{products}));
 assert.match(html,/role="alert"/); assert.match(html,/conflicting filters/);
 assert.doesNotMatch(html,/untrusted-value|href="\/product\//);
});
