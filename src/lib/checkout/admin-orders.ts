import "server-only";
import {createClient} from "@supabase/supabase-js";
import {getSupabasePublicConfig} from "@/lib/supabase/config";
import {requireAdmin} from "@/lib/auth/require-admin";
import type {Confirmation} from "./confirmation";
export function adminDatabase(){const secret=process.env.SUPABASE_SECRET_KEY;if(!secret)throw new Error("Admin storage unavailable");const {url}=getSupabasePublicConfig();return createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
export const validOrderId=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export async function listAdminOrders(page:number,status:string){await requireAdmin();try{let query=adminDatabase().from("guest_order_requests").select("id,status,created_at,total_kobo,delivery",{count:"exact"}).order("created_at",{ascending:false}).order("id",{ascending:false});if(status==="awaiting_payment"||status==="cancelled")query=query.eq("status",status);const {data,error,count}=await query.range((page-1)*25,page*25-1);if(error)return null;return {orders:data as Pick<Confirmation,"id"|"status"|"created_at"|"total_kobo"|"delivery">[],count:count??0};}catch{return null;}}
export async function readAdminOrder(id:string){await requireAdmin();if(!validOrderId(id))return {status:"missing" as const};try{const {data,error}=await adminDatabase().from("guest_order_requests").select("id,status,created_at,subtotal_kobo,delivery_fee_kobo,total_kobo,delivery,items").eq("id",id).maybeSingle();if(error)return {status:"unavailable" as const};return data?{status:"ready" as const,order:data as Confirmation}:{status:"missing" as const};}catch{return {status:"unavailable" as const};}}
