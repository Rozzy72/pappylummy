import "server-only";
import {cookies} from "next/headers";
import {createClient} from "@supabase/supabase-js";
import {getSupabasePublicConfig} from "@/lib/supabase/config";
import {guestOrdersEnabled} from "./config";
import {RECEIPT_COOKIE,verifyReceipt} from "./receipt";
export type Confirmation = {id:string;status:"awaiting_payment"|"cancelled";created_at:string;subtotal_kobo:number;delivery_fee_kobo:number;total_kobo:number;delivery:{name:string;email:string;phone:string;address:string;city:string;state:string};items:{productId:string;name:string;size:string;quantity:number;unitPriceKobo:number;personalization?:{name:string;number:string}|null}[]};
export async function getOrderConfirmation():Promise<{status:"ready";order:Confirmation}|{status:"missing"|"unavailable"}>{
 if(!guestOrdersEnabled())return {status:"unavailable"};
 const secret=process.env.SUPABASE_SECRET_KEY!;
 const store=await cookies();
 const receipts=store.getAll(RECEIPT_COOKIE);
 if(receipts.length!==1)return {status:"missing"};
 const reference=verifyReceipt(receipts[0].value,secret);
 if(!reference)return {status:"missing"};
 try{
  const {url}=getSupabasePublicConfig();
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error}=await db.from("guest_order_requests").select("id,status,created_at,subtotal_kobo,delivery_fee_kobo,total_kobo,delivery,items").eq("id",reference).maybeSingle();
  if(error)return {status:"unavailable"};
  if(!data)return {status:"missing"};
  const order=data as Confirmation;
  if(order.id!==reference||!["awaiting_payment","cancelled"].includes(order.status)||![order.subtotal_kobo,order.delivery_fee_kobo,order.total_kobo].every(n=>Number.isSafeInteger(n)&&n>=0)||order.total_kobo!==order.subtotal_kobo+order.delivery_fee_kobo||!Array.isArray(order.items)||order.items.length<1||order.items.length>20||!order.delivery)return {status:"unavailable"};
  return {status:"ready",order};
 }catch{return {status:"unavailable"};}
}
