import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {presentationHarness} from './homepage-presentation.test.mjs';
const {load,products}=presentationHarness();
const {ProductLetteringPreview,getLetteringTheme}=load('src/components/customizer/product-lettering-preview.tsx');
for(const slug of ['nigeria-home','arsenal-home','barcelona-home']) for(const name of ['ADE','ABCDEFGHIJKLMNOP']) for(const number of ['7','10','88']) {
 test(`product illustration ${slug} / ${name.length} / ${number}`,()=>{
  const product=products.find(p=>p.slug===slug);
  const markup=renderToStaticMarkup(h(ProductLetteringPreview,{product,name,number}));
  assert(markup.includes(product.name));
  assert.match(markup,/illustrative back template/);
  assert.match(markup,/not a photograph or verified back design/);
  assert(markup.includes('/illustrations/backs/'+slug+'-v1.png'));
  assert.match(markup,/AI-generated illustration/);
  assert.match(markup,/text-anchor="middle"/);
  assert(markup.includes('>'+number+'</text>'));
  assert.equal((markup.match(/<image /g)||[]).length,1);
 });
}
test('switching product props changes theme and label without stale artwork',()=>{
 const render=slug=>renderToStaticMarkup(h(ProductLetteringPreview,{product:products.find(p=>p.slug===slug),name:'ADE',number:'88'}));
 assert.notEqual(render('nigeria-home'),render('arsenal-home'));
 assert.equal(getLetteringTheme('barcelona-home').pattern,'stripes');
 assert.equal(getLetteringTheme('arsenal-home').pattern,'sleeves');
 assert.equal(getLetteringTheme('nigeria-home').palette,'forest');
});
test('unknown and unverified styles fail honestly to a neutral illustration',()=>{
 for(const slug of ['future-away','__proto__']) {
  assert.equal(getLetteringTheme(slug),undefined);
  const product={...products[0],slug};
  const markup=renderToStaticMarkup(h(ProductLetteringPreview,{product,name:'ADE',number:'7'}));
  assert.match(markup,/Neutral template/);
  assert.match(markup,/var\(--sd-kit-paper\)/);
 }
});
test('gallery entries are never promoted to a back photo and current products are not mutated',()=>{
 const product={...products[0],images:['not-a-verified-back.webp']};
 const before=JSON.stringify(product);
 const markup=renderToStaticMarkup(h(ProductLetteringPreview,{product,name:'ADE',number:'10'}));
 assert.doesNotMatch(markup,/not-a-verified-back/);
 assert.match(markup,/href="\/illustrations\/backs\//);
 assert.equal(JSON.stringify(product),before);
});

test('every generated illustration has a local file and arbitrary paths are rejected',()=>{const ui=load('packages/ui/src/index.tsx');for(const slug of ['arsenal-home','barcelona-home','bayern-munich-home','brazil-international','chelsea-away','liverpool-home','manchester-city-third','manchester-united-home','nigeria-retro','real-madrid-player','nigeria-home'])assert.equal(ui.hasLetteringArtwork(slug),true);for(const slug of ['__proto__','../private','https://example.test/image.png','unverified-new-product'])assert.equal(ui.hasLetteringArtwork(slug),false);});
