import assert from 'node:assert/strict';
import { test, after, beforeEach, afterEach } from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const temp=mkdtempSync(join(tmpdir(),'jersey-images-'));
const oldOrigin=process.env.NEXT_PUBLIC_SUPABASE_URL;
const oldMode=process.env.NODE_ENV;
let testMode;
beforeEach(() => { testMode = process.env.NODE_ENV; });
afterEach(() => {
  if (testMode === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = testMode;
});
after(()=>{if(oldOrigin===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldOrigin;if(oldMode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldMode;delete globalThis.imageTest;rmSync(temp,{recursive:true,force:true});});
function compile(file,name){const out=ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText.replaceAll('require("@/utils/product-image")','require("./images.cjs")').replaceAll('require("./src/utils/product-image")','require("./images.cjs")').replaceAll('require("next/image")','({default:"image"})').replaceAll('require("react")','({useState:()=>[globalThis.imageTest.failed,()=>{globalThis.imageTest.failed=true;}]})').replaceAll('require("react/jsx-runtime")','require('+JSON.stringify(require.resolve('react/jsx-runtime'))+')');const p=join(temp,name+'.cjs');writeFileSync(p,out);return p;}
const u=require(compile('src/utils/product-image.ts','images'));
const id='423bb850-23f3-493f-a3c1-5b03c2096f93';const ref=id+'/main-dev-v1.webp';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test-project.supabase.co';
test('approved reference grammar and exact placeholder',()=>{assert(u.isProductImageReference(u.productPlaceholder,id));for(const name of ['main-v1','main-dev-v1','front-v2','front-dev-v2','back-v1','back-dev-v3','detail-v1','detail-dev-v1','detail-2-v1','detail-2-dev-v12'])assert(u.isProductImageReference(id+'/'+name+'.webp',id));});
test('malicious references, foreign UUIDs and malformed versions rejected',()=>{for(const value of ['https://evil.example/x','http://evil.example/x','javascript:alert(1)','data:image/webp;base64,x','blob:x','//evil.example/x','/products/other.svg',id+'/../main-v1.webp',id+'/%2e/main-v1.webp',ref+'?x=1',ref+'#x',ref+'\n',' '+ref,ref.replace('/','\\'),id+'/extra/main-v1.webp','bad/main-v1.webp',ref.replace('423bb850','423bb851'),id+'/main-v1.svg',id+'/main-v1.png',id+'/main-v0.webp',id+'/main-v-1.webp',id+'/main-v01.webp',id+'/detail-0-v1.webp',null,{},['x']]){assert.equal(u.isProductImageReference(value,id),false);assert.equal(u.getProductImage(value,id),u.productPlaceholder);}});
test('gallery skips bad elements, deduplicates, excludes main, caps eight, copies input',()=>{const additional=Object.freeze([ref,null,'https://evil.example/x',...Array.from({length:12},(_,i)=>id+'/detail-'+(i+1)+'-v1.webp')]);const result=u.getProductGallery(ref,additional,id);assert.equal(result.length,9);assert.equal(result[0],ref);assert.equal(new Set(result).size,9);assert.equal(result[1],id+'/detail-1-v1.webp');assert.deepEqual(u.getProductGallery(null,{},id),[u.productPlaceholder]);});
test('resolver uses configured origin and fixed bucket only',()=>{assert.equal(u.resolveProductImage(ref,id),'https://test-project.supabase.co/storage/v1/object/public/product-images/'+ref);assert.equal(u.resolveProductImage('other-bucket/'+ref,id),u.productPlaceholder);assert.equal(u.resolveProductImage('https://test-project.supabase.co/storage/v1/object/public/product-images/'+ref,id),u.productPlaceholder);});
test('origin validation and missing development config',()=>{for(const value of ['http://test-project.supabase.co','https://user:pass@example.com','https://example.com/path','https://example.com?x=1','https://example.com#x','https://*.supabase.co','https://127.0.0.1','https://localhost','not-url'])assert.throws(()=>u.getProductImageOrigin(value));delete process.env.NEXT_PUBLIC_SUPABASE_URL;assert.equal(u.resolveProductImage(ref,id),u.productPlaceholder);process.env.NEXT_PUBLIC_SUPABASE_URL='https://test-project.supabase.co';});
test('Next config restricts exact host, endpoint, search, SVG, local IP and redirects',()=>{const config=require(compile('next.config.ts','config')).default;assert.deepEqual(config.images.remotePatterns,[{protocol:'https',hostname:'test-project.supabase.co',port:'',pathname:u.productImageEndpoint+'**',search:''}]);assert.equal(config.images.maximumRedirects,0);assert.equal(config.images.dangerouslyAllowSVG,false);assert.equal(config.images.dangerouslyAllowLocalIP,false);process.env.NODE_ENV='production';delete process.env.NEXT_PUBLIC_SUPABASE_URL;assert.throws(()=>require(compile('next.config.ts','missing-config')));process.env.NEXT_PUBLIC_SUPABASE_URL='https://test-project.supabase.co';});
test('actual image wrapper error switches once to placeholder and retains layout',()=>{const {ProductImage}=require(compile('src/components/product/product-image.tsx','component'));globalThis.imageTest={failed:false};const element=ProductImage({reference:ref,productId:id,alt:'Nigeria jersey',fill:true,sizes:'50vw'});const first=element.type(element.props);assert(first.props.src.startsWith('https://test-project.supabase.co/'));first.props.onError();const fallback=element.type(element.props);assert.equal(fallback.props.src,u.productPlaceholder);assert.equal(fallback.props.onError,undefined);assert.equal(fallback.props.fill,true);assert(fallback.props.alt.includes('Nigeria jersey'));const changed=ProductImage({reference:id+'/front-v2.webp',productId:id,alt:'Nigeria',fill:true});assert.notEqual(changed.key,element.key);});

test('environment guard controls actual Next image output without caller override', () => {
  const { ProductImage } = require(compile('src/components/product/product-image.tsx', 'environment-component'));
  const { getImgProps } = require('next/dist/shared/lib/get-img-props');
  const defaultLoader = require('next/dist/shared/lib/image-loader').default;
  const { imageConfigDefault } = require('next/dist/shared/lib/image-config');
  const config = require(compile('next.config.ts', 'environment-config')).default;
  for (const mode of ['development', 'production', 'test', undefined]) {
    if (mode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = mode;
    globalThis.imageTest = { failed: false };
    const element = ProductImage({ reference: ref, productId: id, alt: 'Nigeria jersey', width: 400, height: 500, unoptimized: mode !== 'development' });
    const rendered = element.type(element.props);
    assert.equal(rendered.props.unoptimized, mode === 'development');
    const { props } = getImgProps(rendered.props, { defaultLoader, imgConf: { ...imageConfigDefault, ...config.images } });
    if (mode === 'development') {
      assert.equal(props.src, u.resolveProductImage(ref, id));
      assert.equal(props.srcSet, undefined);
    } else {
      assert(props.src.startsWith('/_next/image?'));
      assert(props.srcSet);
    }
  }
});

test('development rejects unsafe references and preserves one-way placeholder fallback', () => {
  process.env.NODE_ENV = 'development';
  const { ProductImage } = require(compile('src/components/product/product-image.tsx', 'development-fallback'));
  for (const reference of [u.productPlaceholder, ref.replace('423bb850', '423bb851'), 'https://evil.example/x', 'javascript:alert(1)', 'data:image/webp;base64,x', 'blob:x', id + '/../main-v1.webp']) {
    globalThis.imageTest = { failed: false };
    const element = ProductImage({ reference, productId: id, alt: 'Nigeria jersey', fill: true });
    const rendered = element.type(element.props);
    assert.equal(rendered.props.src, u.productPlaceholder);
    assert.equal(rendered.props.unoptimized, false);
    assert.equal(rendered.props.onError, undefined);
  }
  globalThis.imageTest = { failed: false };
  const element = ProductImage({ reference: ref, productId: id, alt: 'Nigeria jersey', fill: true });
  const remote = element.type(element.props);
  assert.equal(remote.props.unoptimized, true);
  remote.props.onError();
  const fallback = element.type(element.props);
  assert.equal(fallback.props.src, u.productPlaceholder);
  assert.equal(fallback.props.unoptimized, false);
  assert.equal(fallback.props.onError, undefined);
});
