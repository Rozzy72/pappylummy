"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth/require-admin";
import {adminDatabase,validOrderId} from "@/lib/checkout/admin-orders";
export type CancelState={status:"idle"|"success"|"error";message:string};
export async function cancelUnpaidRequest(_previous:CancelState,form:FormData):Promise<CancelState>{
 await requireAdmin(true);
 const id=form.get("orderId");if(form.getAll("orderId").length!==1||typeof id!=="string"||!validOrderId(id)||form.getAll("confirm").length!==1||form.get("confirm")!=="yes")return {status:"error",message:"Confirm cancellation before continuing."};
 try{const {data,error}=await adminDatabase().from("guest_order_requests").update({status:"cancelled"}).eq("id",id).eq("status","awaiting_payment").select("id").maybeSingle();if(error||!data)return {status:"error",message:"The request could not be cancelled. It may already have changed; refresh its details."};}catch{return {status:"error",message:"Unable to cancel this request right now."};}
 revalidatePath("/admin/orders");revalidatePath("/admin/orders/"+id);revalidatePath("/checkout/confirmation");return {status:"success",message:"Unpaid request cancelled. No payment or refund was processed."};
}
