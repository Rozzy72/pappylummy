"use server";
import { cookies } from "next/headers";
import { RECEIPT_COOKIE, RECEIPT_SECONDS, signReceipt } from "@/lib/checkout/receipt";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parseOrderRequest } from "@/lib/checkout/request";
import { guestOrdersEnabled } from "@/lib/checkout/config";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
export type OrderResult = {status:"success";reference:string;totalKobo:number}|{status:"error";message:string};
export async function submitGuestOrder(input:unknown):Promise<OrderResult>{
 if(!guestOrdersEnabled())return {status:"error",message:"Order saving is not available yet. Your bag has been kept."};
 const request=parseOrderRequest(input);
 if(!request)return {status:"error",message:"Check your delivery details and jersey selections, then review them again."};
 const {key,...payload}=request;
 const fingerprint=createHash("sha256").update(JSON.stringify(payload)).digest("hex");
 try{
  const {url}=getSupabasePublicConfig();
  const client=createClient(url,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error}=await client.rpc("save_guest_order_request",{p_key:key,p_fingerprint:fingerprint,p_delivery:request.delivery,p_items:request.items,p_expected_total:request.expectedTotalKobo});
  if(error||!data||typeof data.reference!=="string"||!Number.isSafeInteger(data.total_kobo))return {status:"error",message:"Unable to save this order request. Prices or availability may have changed, or the request limit was reached. Review your bag before retrying."};
  const receipt=signReceipt(data.reference,process.env.SUPABASE_SECRET_KEY!);
  (await cookies()).set(RECEIPT_COOKIE,receipt,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/checkout",maxAge:RECEIPT_SECONDS});
  return {status:"success",reference:data.reference,totalKobo:data.total_kobo};
 }catch{return {status:"error",message:"Unable to save your order request right now. Your bag has been kept. Retry with the same details."};}
}
