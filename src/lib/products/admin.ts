import 'server-only';
import {requireAdmin} from '@/lib/auth/require-admin';
import {adminDatabase,validOrderId} from '@/lib/checkout/admin-orders';
import type {ProductRow} from '@/types/database';
export async function adminProducts(){await requireAdmin();try{const {data,error}=await adminDatabase().from('products').select('*').order('name').limit(500);return error?null:data as ProductRow[];}catch{return null;}}
export async function adminProduct(id:string){await requireAdmin();if(!validOrderId(id))return null;const {data,error}=await adminDatabase().from('products').select('*').eq('id',id).maybeSingle();if(error)throw Error('Unable to load this jersey.');return data as ProductRow|null;}
