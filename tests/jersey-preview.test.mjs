import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadUi} from './ui-loader.mjs';
const {JerseyPreview}=loadUi();
for (const name of ['ADE','ABCDEFGHIJKLMNOP']) for(const number of ['7','10','88']) {
 test(`lettering presentation: ${name.length}-character name / ${number}`,()=>{
  const markup=renderToStaticMarkup(h(JerseyPreview,{name,number}));
  assert.match(markup,/viewBox="0 0 480 510"/);
  assert.match(markup,/text-anchor="middle"/);
  assert.match(markup,new RegExp('<text x="240" y="280" font-size="88" font-weight="900" letter-spacing="0">'+number+'</text>'));
  assert.match(markup,/x="240" y="159"/);
  if(name.length>=8) assert.match(markup,/textLength="200" lengthAdjust="spacingAndGlyphs"/);
  assert(markup.includes(name));
 });
}
test('new props immediately render the changed number without cached lettering',()=>{
 const render=number=>renderToStaticMarkup(h(JerseyPreview,{name:'ADE',number}));
 assert.match(render('7'),/>7<\/text>/);
 assert.match(render('88'),/>88<\/text>/);
 assert.doesNotMatch(render('88'),/>7<\/text>/);
});
test('front preview remains free of back lettering',()=>{
 const markup=renderToStaticMarkup(h(JerseyPreview,{view:'front',name:'ADE',number:'88'}));
 assert.doesNotMatch(markup,/>88<\/text>|>ADE<\/text>/);
 assert.match(markup,/NAIJA/);
});

