'use server';
import {randomUUID} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/auth/require-admin';
import {adminDatabase,validOrderId} from '@/lib/checkout/admin-orders';
import {parseAdminProduct} from '@/lib/products/admin-validation';
export type ProductSaveState={status:'idle'|'success'|'error';message:string;id?:string};
export async function saveAdminProduct(_previous:ProductSaveState,form:FormData):Promise<ProductSaveState>{
 await requireAdmin(true);
 let row:ReturnType<typeof parseAdminProduct>;try{row=parseAdminProduct(form);}catch(e){return {status:'error',message:e instanceof Error?e.message:'Check the jersey details.'};}
 const values=form.getAll('id'),versions=form.getAll('version');if(values.length!==1||typeof values[0]!=='string'||versions.length!==1||typeof versions[0]!=='string')return {status:'error',message:'Invalid product request.'};
 const existing=values[0],version=versions[0],id=existing||randomUUID();if(existing&&(!validOrderId(existing)||!/^\d{4}-\d{2}-\d{2}T/.test(version)))return {status:'error',message:'Refresh this product before saving.'};
 const photos=form.getAll('photo');if(photos.length>1)return {status:'error',message:'Choose one photo.'};const photo=photos[0];if(photo instanceof File&&photo.size>0&&(photo.size>750000||photo.type!=='image/webp'))return {status:'error',message:'Choose a WebP photo under 750 KB.'};
 let uploaded:string|undefined;
 try{const db=adminDatabase();if(photo instanceof File&&photo.size>0){const bytes=new Uint8Array(await photo.arrayBuffer());if(String.fromCharCode(...bytes.slice(0,4))!=='RIFF'||String.fromCharCode(...bytes.slice(8,12))!=='WEBP')return {status:'error',message:'The photo must be a valid WebP image.'};uploaded=id+'/main-v'+Date.now()+'.webp';const upload=await db.storage.from('product-images').upload(uploaded,bytes,{contentType:'image/webp',upsert:false});if(upload.error)return {status:'error',message:'Photo upload failed. Your jersey was not saved.'};}
 const payload={...row,...(uploaded?{image_path:uploaded}:{}),updated_at:new Date().toISOString()};
 const result=existing?await db.from('products').update(payload).eq('id',id).eq('updated_at',version).select('id').maybeSingle():await db.from('products').insert({...payload,id}).select('id').single();
 if(result.error||!result.data){if(uploaded)await db.storage.from('product-images').remove([uploaded]);return {status:'error',message:result.error?.code==='23505'?'That URL name is already used. Choose another.':'Unable to save. Another admin may have edited this jersey; reload before trying again.'};}
 for(const route of ['/','/shop','/clubs','/categories','/cart','/wishlist','/customize','/checkout','/admin/products'])revalidatePath(route);revalidatePath('/product/[slug]','page');revalidatePath('/admin/products/'+id);
 return {status:'success',message:'Jersey saved. Shop prices and availability now use these details.',id};
 }catch{return {status:'error',message:'Unable to save the jersey right now.'};}
}
