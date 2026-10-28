"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { readProfileAddress, type AuthState } from "@/lib/auth/validation";
async function persistProfile(form: FormData, completing: boolean): Promise<AuthState> {
  const {client,userId} = await requireUser(true);
  const name=form.get("full_name"), phone=form.get("phone");
  if(form.getAll("full_name").length!==1 || form.getAll("phone").length!==1 || typeof name!=="string" || typeof phone!=="string") return {status:"error",message:"Enter a valid name and phone number."};
  const full_name=name.trim().normalize("NFC"), cleanedPhone=phone.trim();
  if(completing && !full_name) return {status:"error",message:"Enter your full name to complete your profile."};
  if(completing && !cleanedPhone) return {status:"error",message:"Enter your phone number to complete your profile."};
  if(full_name.length>100 || /[\u0000-\u001f\u007f]/.test(full_name) || cleanedPhone.length>30 || (cleanedPhone && (!/^\+?[0-9 ()-]+$/.test(cleanedPhone) || cleanedPhone.replace(/\D/g,"").length<7 || cleanedPhone.replace(/\D/g,"").length>15))) return {status:"error",message:"Use a name up to 100 characters and a phone number with 7–15 digits."};
  try {
    const {data,error}=await client.from("profiles").update({full_name:full_name||null,phone:cleanedPhone||null}).eq("id",userId).select("id").maybeSingle();
    if(error || !data) return {status:"error",message:"Unable to save your profile. Please try again."};
  } catch {return {status:"error",message:"Unable to save your profile. Please try again."};}
  revalidatePath("/account");
  revalidatePath("/account/setup");
  return {status:"success",message:"Your profile has been saved."};
}

export async function saveProfile(_previous:AuthState,form:FormData):Promise<AuthState>{
  // Verify identity before processing optional address updates.
  const {client}=await requireUser(true);
  const hasAddress = ["address","city","state"].some(key=>form.has(key));
  const address = hasAddress ? readProfileAddress(form) : null;
  if(hasAddress && !address)return {status:"error",message:"Enter your address, city and a valid Nigerian state, or leave all three blank."};
  const result=await persistProfile(form,false);
  if(result.status!=="success" || !address)return result;
  try{
    const {error}=await client.auth.updateUser({data:address});
    if(error)return {status:"error",message:"Your name and phone were saved, but your address could not be saved. Please try again."};
  }catch{return {status:"error",message:"Your name and phone were saved, but your address could not be saved. Please try again."};}
  revalidatePath("/account");revalidatePath("/account/setup");
  return result;
}
export async function completeProfile(_previous:AuthState,form:FormData):Promise<AuthState>{const result=await persistProfile(form,true);if(result.status!=='success')return result;redirect('/account');}
